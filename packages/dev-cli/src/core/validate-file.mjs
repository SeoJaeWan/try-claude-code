import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parse } from "@babel/parser";

import {
  isRelativeCliPath,
  normalizeCliPath,
  splitCliPath
} from "./path-utils.mjs";
import { applyCaseTransform } from "./recipe-utils.mjs";
import { validateRequest } from "./profile-validator.mjs";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IMPORT_RESOLUTION_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules"
]);

function createViolation(code, message, details = {}, suggestion) {
  return {
    code,
    severity: "error",
    message,
    details,
    ...(suggestion ? { suggestion } : {})
  };
}

function isFunctionLikeNode(node) {
  return Boolean(node) && (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  );
}

function isPascalCaseName(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function toFsPath(repoRoot, cliPath) {
  return path.join(repoRoot, ...splitCliPath(cliPath));
}

function toCliPath(repoRoot, filePath) {
  return normalizeCliPath(path.relative(repoRoot, filePath));
}

function isJsxNode(node) {
  return Boolean(node) && (
    node.type === "JSXElement" ||
    node.type === "JSXFragment"
  );
}

function nodeContainsJsx(node) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some((item) => nodeContainsJsx(item));
  }

  if (isJsxNode(node)) {
    return true;
  }

  if (isFunctionLikeNode(node)) {
    return false;
  }

  return Object.values(node).some((value) => nodeContainsJsx(value));
}

function blockHasJsxReturn(node) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some((item) => blockHasJsxReturn(item));
  }

  if (isFunctionLikeNode(node)) {
    return false;
  }

  if (node.type === "ReturnStatement") {
    return nodeContainsJsx(node.argument);
  }

  return Object.values(node).some((value) => blockHasJsxReturn(value));
}

function functionReturnsJsx(node) {
  if (!isFunctionLikeNode(node)) {
    return false;
  }

  if (isJsxNode(node.body)) {
    return true;
  }

  if (node.body?.type !== "BlockStatement") {
    return nodeContainsJsx(node.body);
  }

  return blockHasJsxReturn(node.body);
}

function collectNestedFunctionLikeDeclarations(node) {
  const results = [];

  function visit(current) {
    if (!current || typeof current !== "object") {
      return;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item);
      }
      return;
    }

    if (current.type === "FunctionDeclaration" && current.id?.name) {
      results.push({
        kind: "functionDeclaration",
        name: current.id.name,
        node: current
      });
      return;
    }

    if (current.type === "VariableDeclaration") {
      for (const declaration of current.declarations ?? []) {
        if (
          declaration.id?.type === "Identifier" &&
          isFunctionLikeNode(declaration.init)
        ) {
          results.push({
            kind: "variableFunction",
            name: declaration.id.name,
            node: declaration.init
          });
          continue;
        }

        visit(declaration);
      }
      return;
    }

    if (isFunctionLikeNode(current)) {
      return;
    }

    for (const value of Object.values(current)) {
      visit(value);
    }
  }

  visit(node);
  return results;
}

function collectProgramMetadata(ast) {
  const imports = [];
  const topLevelFunctions = new Map();
  const typeNames = new Set();
  let defaultExportDeclaration = null;

  for (const statement of ast.program.body) {
    if (statement.type === "ImportDeclaration") {
      imports.push(String(statement.source.value));
      continue;
    }

    if (statement.type === "TSInterfaceDeclaration") {
      typeNames.add(statement.id.name);
      continue;
    }

    if (statement.type === "TSTypeAliasDeclaration") {
      typeNames.add(statement.id.name);
      continue;
    }

    if (statement.type === "FunctionDeclaration" && statement.id?.name) {
      topLevelFunctions.set(statement.id.name, {
        kind: "functionDeclaration",
        name: statement.id.name,
        node: statement
      });
      continue;
    }

    if (statement.type === "VariableDeclaration") {
      for (const declaration of statement.declarations ?? []) {
        if (
          declaration.id?.type === "Identifier" &&
          isFunctionLikeNode(declaration.init)
        ) {
          topLevelFunctions.set(declaration.id.name, {
            kind: "variableFunction",
            name: declaration.id.name,
            node: declaration.init
          });
        }
      }
      continue;
    }

    if (!statement.declaration) {
      continue;
    }

    if (statement.type === "ExportNamedDeclaration") {
      const { declaration } = statement;
      if (declaration.type === "TSInterfaceDeclaration") {
        typeNames.add(declaration.id.name);
      } else if (declaration.type === "TSTypeAliasDeclaration") {
        typeNames.add(declaration.id.name);
      } else if (declaration.type === "FunctionDeclaration" && declaration.id?.name) {
        topLevelFunctions.set(declaration.id.name, {
          kind: "functionDeclaration",
          name: declaration.id.name,
          node: declaration
        });
      } else if (declaration.type === "VariableDeclaration") {
        for (const declarator of declaration.declarations ?? []) {
          if (
            declarator.id?.type === "Identifier" &&
            isFunctionLikeNode(declarator.init)
          ) {
            topLevelFunctions.set(declarator.id.name, {
              kind: "variableFunction",
              name: declarator.id.name,
              node: declarator.init
            });
          }
        }
      }
      continue;
    }

    if (statement.type === "ExportDefaultDeclaration") {
      defaultExportDeclaration = statement.declaration;
    }
  }

  let defaultExport = null;
  if (defaultExportDeclaration?.type === "Identifier") {
    defaultExport = {
      kind: "identifier",
      name: defaultExportDeclaration.name,
      target: topLevelFunctions.get(defaultExportDeclaration.name) ?? null
    };
  } else if (isFunctionLikeNode(defaultExportDeclaration)) {
    defaultExport = {
      kind: "inline",
      name: defaultExportDeclaration.id?.name ?? null,
      target: {
        kind: defaultExportDeclaration.type === "ArrowFunctionExpression"
          ? "variableFunction"
          : "functionDeclaration",
        name: defaultExportDeclaration.id?.name ?? null,
        node: defaultExportDeclaration
      }
    };
  } else if (defaultExportDeclaration) {
    defaultExport = {
      kind: "unsupported",
      name: null,
      target: null
    };
  }

  return {
    defaultExport,
    imports,
    topLevelFunctions,
    typeNames
  };
}

function parseModule(filePath, content) {
  return parse(content, {
    sourceFilename: filePath,
    sourceType: "module",
    plugins: ["typescript", "jsx"]
  });
}

function deriveMutationMethod(name) {
  if (name.startsWith("usePost")) {
    return "POST";
  }

  if (name.startsWith("usePut")) {
    return "PUT";
  }

  if (name.startsWith("usePatch")) {
    return "PATCH";
  }

  if (name.startsWith("useDelete")) {
    return "DELETE";
  }

  if (name.startsWith("useGet")) {
    return "GET";
  }

  return null;
}

function inferPublisherTarget(normalizedFilePath, dirSegments) {
  const violations = [];
  const expectedName = dirSegments.at(-1)
    ? applyCaseTransform(dirSegments.at(-1), "pascal")
    : null;

  if (dirSegments.length < 3 || dirSegments.length > 4) {
    violations.push(
      createViolation(
        "INVALID_COMPONENT_ENTRY_PATH",
        "Publisher component file must live at components/common/{component}/index.tsx, components/{domain}/{component}/index.tsx, or a direct child under the component folder",
        {
          file: normalizedFilePath
        }
      )
    );
  }

  return {
    commandName: "component",
    expectedEntryFileName: "index.tsx",
    expectedName,
    validationArgs: {
      name: expectedName,
      path: dirSegments.join("/")
    },
    isDirectChild: dirSegments.length === 4,
    parentBaseDir: dirSegments.length >= 4
      ? dirSegments.slice(0, 3).join("/")
      : dirSegments.join("/"),
    violations
  };
}

function inferFrontendTarget(normalizedFilePath, dirSegments) {
  if (dirSegments[1] === "utils") {
    const expectedName = dirSegments.at(-1) ?? null;
    const violations = [];

    if (dirSegments.length !== 4) {
      violations.push(
        createViolation(
          "INVALID_HOOK_ENTRY_PATH",
          "Custom hook file must live at hooks/utils/{domain}/{hookName}/index.ts",
          {
            file: normalizedFilePath
          }
        )
      );
    }

    return {
      commandName: "hook",
      expectedEntryFileName: "index.ts",
      expectedName,
      validationArgs: {
        name: expectedName,
        path: dirSegments.slice(0, -1).join("/")
      },
      violations
    };
  }

  if (dirSegments[1] === "apis") {
    const expectedName = dirSegments.at(-1) ?? null;
    const kindSegment = dirSegments[3];
    const kind = kindSegment === "queries"
      ? "query"
      : kindSegment === "mutations"
        ? "mutation"
        : null;
    const violations = [];

    if (dirSegments.length !== 5) {
      violations.push(
        createViolation(
          "INVALID_API_HOOK_ENTRY_PATH",
          "API hook file must live at hooks/apis/{domain}/{queries|mutations}/{hookName}/index.ts",
          {
            file: normalizedFilePath
          }
        )
      );
    }

    if (!kind) {
      violations.push(
        createViolation(
          "INVALID_API_KIND_SEGMENT",
          "API hook path must use queries or mutations before the hook name",
          {
            file: normalizedFilePath
          }
        )
      );
    }

    return {
      commandName: "apiHook",
      expectedEntryFileName: "index.ts",
      expectedName,
      validationArgs: {
        kind,
        method: kind === "query" ? "GET" : deriveMutationMethod(expectedName ?? ""),
        name: expectedName,
        path: dirSegments.slice(0, -1).join("/")
      },
      violations
    };
  }

  return {
    commandName: null,
    expectedEntryFileName: null,
    expectedName: null,
    validationArgs: {},
    violations: [
      createViolation(
        "UNSUPPORTED_VALIDATION_TARGET",
        "Frontend validate-file only supports hooks/utils/* and hooks/apis/* files",
        {
          file: normalizedFilePath
        }
      )
    ]
  };
}

function inferValidationTarget(role, rawFilePath) {
  const normalizedFilePath = normalizeCliPath(rawFilePath);
  const violations = [];

  if (!isRelativeCliPath(normalizedFilePath)) {
    violations.push(
      createViolation(
        "INVALID_FILE_PATH",
        "validate-file requires a relative repo path",
        {
          file: rawFilePath
        }
      )
    );

    return {
      file: normalizedFilePath,
      commandName: null,
      expectedEntryFileName: null,
      expectedName: null,
      validationArgs: {},
      violations
    };
  }

  const segments = splitCliPath(normalizedFilePath);
  const dirSegments = segments.slice(0, -1);
  const firstSegment = segments[0];
  const target = role === "publisher"
    ? firstSegment === "components"
      ? inferPublisherTarget(normalizedFilePath, dirSegments)
      : {
          commandName: null,
          expectedEntryFileName: null,
          expectedName: null,
          validationArgs: {},
          violations: [
            createViolation(
              "UNSUPPORTED_VALIDATION_TARGET",
              "Publisher validate-file only supports components/* files",
              {
                file: normalizedFilePath
              }
            )
          ]
        }
    : role === "frontend"
      ? firstSegment === "hooks"
        ? inferFrontendTarget(normalizedFilePath, dirSegments)
        : {
            commandName: null,
            expectedEntryFileName: null,
            expectedName: null,
            validationArgs: {},
            violations: [
              createViolation(
                "UNSUPPORTED_VALIDATION_TARGET",
                "Frontend validate-file only supports hooks/* files",
                {
                  file: normalizedFilePath
                }
              )
            ]
          }
      : {
          commandName: null,
          expectedEntryFileName: null,
          expectedName: null,
          validationArgs: {},
          violations: [
            createViolation(
              "UNSUPPORTED_VALIDATION_TARGET",
              "validate-file is only available for tcp and tcf",
              {
                file: normalizedFilePath
              }
            )
          ]
        };

  return {
    file: normalizedFilePath,
    ...target,
    violations: [...violations, ...(target.violations ?? [])]
  };
}

function getNamedDefaultExportViolations({
  commandName,
  defaultExport,
  expectedName,
  typeNames
}) {
  const violations = [];

  if (!defaultExport) {
    violations.push(
      createViolation(
        "MISSING_DEFAULT_EXPORT",
        "Entry file must default export the main function",
        {
          expectedName
        }
      )
    );
    return violations;
  }

  if (defaultExport.kind === "unsupported") {
    violations.push(
      createViolation(
        "INVALID_DEFAULT_EXPORT",
        "Default export must point to a named function",
        {
          expectedName
        }
      )
    );
    return violations;
  }

  if (!defaultExport.name) {
    violations.push(
      createViolation(
        "MISSING_NAMED_DEFAULT_EXPORT",
        "Default export must reference a named function",
        {
          expectedName
        }
      )
    );
  }

  if (!defaultExport.target?.node) {
    violations.push(
      createViolation(
        "INVALID_DEFAULT_EXPORT_TARGET",
        "Default export must reference a top-level function declaration",
        {
          expectedName
        }
      )
    );
    return violations;
  }

  if (defaultExport.name && expectedName && defaultExport.name !== expectedName) {
    violations.push(
      createViolation(
        "EXPORT_NAME_MISMATCH",
        `Default export name must match ${expectedName}`,
        {
          actualName: defaultExport.name,
          expectedName
        }
      )
    );
  }

  if (defaultExport.target.kind !== "variableFunction" || defaultExport.target.node.type !== "ArrowFunctionExpression") {
    violations.push(
      createViolation(
        "ENTRY_FUNCTION_MUST_BE_ARROW",
        "Entry function must use arrow function style",
        {
          actualName: defaultExport.name ?? expectedName
        }
      )
    );
  }

  if (commandName === "component") {
    const expectedPropsType = `${expectedName}Props`;
    if (!typeNames.has(expectedPropsType)) {
      violations.push(
        createViolation(
          "MISSING_PROPS_TYPE",
          `Component file must define ${expectedPropsType}`,
          {
            expectedPropsType
          }
        )
      );
    }
  }

  return violations;
}

function getTopLevelPublisherViolations(topLevelFunctions, expectedName) {
  const violations = [];

  for (const declaration of topLevelFunctions.values()) {
    if (declaration.name === expectedName || !functionReturnsJsx(declaration.node)) {
      continue;
    }

    violations.push(
      createViolation(
        isPascalCaseName(declaration.name)
          ? "SAME_FILE_SUBCOMPONENT"
          : "SAME_FILE_JSX_HELPER",
        isPascalCaseName(declaration.name)
          ? "Publisher component file must not define additional top-level subcomponents"
          : "Publisher component file must not define additional top-level JSX helpers",
        {
          component: expectedName,
          name: declaration.name
        },
        `Move ${declaration.name} into its own component folder under ${expectedName}`
      )
    );
  }

  return violations;
}

function getPublisherStructureViolations(defaultExport, expectedName) {
  if (!defaultExport?.target?.node) {
    return [];
  }

  const nestedViolations = [];
  const nestedDeclarations = collectNestedFunctionLikeDeclarations(defaultExport.target.node.body);

  for (const declaration of nestedDeclarations) {
    if (!functionReturnsJsx(declaration.node)) {
      continue;
    }

    nestedViolations.push(
      createViolation(
        isPascalCaseName(declaration.name)
          ? "SAME_FILE_SUBCOMPONENT"
          : "SAME_FILE_JSX_HELPER",
        isPascalCaseName(declaration.name)
          ? "Publisher component file must not define nested subcomponents in the same file"
          : "Publisher component file must not define nested JSX helpers in the same file",
        {
          component: defaultExport.name ?? expectedName,
          name: declaration.name
        },
        `Move ${declaration.name} into its own component folder under ${expectedName}`
      )
    );
  }

  return nestedViolations;
}

function classifyHookDeclarationViolation(name, entryName, node) {
  if (name === entryName) {
    return null;
  }

  if (name.startsWith("use")) {
    return createViolation(
      "ADDITIONAL_HOOK_DECLARATION",
      "Hook entry file must not define additional hooks",
      {
        entryName,
        name
      }
    );
  }

  if (functionReturnsJsx(node)) {
    return createViolation(
      isPascalCaseName(name)
        ? "REACT_COMPONENT_IN_HOOK_FILE"
        : "JSX_HELPER_IN_HOOK_FILE",
      isPascalCaseName(name)
        ? "Hook entry file must not define React components"
        : "Hook entry file must not define JSX-returning helpers",
      {
        entryName,
        name
      }
    );
  }

  return null;
}

function getFrontendStructureViolations(defaultExport, expectedName, topLevelFunctions) {
  const violations = [];

  for (const declaration of topLevelFunctions.values()) {
    const violation = classifyHookDeclarationViolation(
      declaration.name,
      expectedName,
      declaration.node
    );

    if (violation) {
      violations.push(violation);
    }
  }

  if (!defaultExport?.target?.node) {
    return violations;
  }

  const nestedDeclarations = collectNestedFunctionLikeDeclarations(defaultExport.target.node.body);
  for (const declaration of nestedDeclarations) {
    const violation = classifyHookDeclarationViolation(
      declaration.name,
      expectedName,
      declaration.node
    );

    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}

async function readPathConfig(configPath) {
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);

    return {
      baseUrl: parsed.compilerOptions?.baseUrl ?? ".",
      paths: parsed.compilerOptions?.paths ?? {}
    };
  } catch {
    return {
      baseUrl: ".",
      paths: {}
    };
  }
}

async function findNearestPathConfig(filePath, repoRoot, cache) {
  let current = path.dirname(toFsPath(repoRoot, filePath));

  while (true) {
    if (cache.has(current)) {
      return cache.get(current);
    }

    const tsconfigPath = path.join(current, "tsconfig.json");
    const jsconfigPath = path.join(current, "jsconfig.json");

    if (existsSync(tsconfigPath)) {
      const config = {
        ...(await readPathConfig(tsconfigPath)),
        configDir: current
      };
      cache.set(current, config);
      return config;
    }

    if (existsSync(jsconfigPath)) {
      const config = {
        ...(await readPathConfig(jsconfigPath)),
        configDir: current
      };
      cache.set(current, config);
      return config;
    }

    if (current === repoRoot) {
      cache.set(current, null);
      return null;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      cache.set(current, null);
      return null;
    }

    current = parent;
  }
}

function matchPathPattern(source, pattern) {
  if (!pattern.includes("*")) {
    return source === pattern ? [""] : null;
  }

  const [prefix, suffix] = pattern.split("*");
  if (!source.startsWith(prefix) || !source.endsWith(suffix)) {
    return null;
  }

  return [source.slice(prefix.length, source.length - suffix.length)];
}

function resolveImportCandidateToFile(candidatePath) {
  if (path.extname(candidatePath)) {
    return existsSync(candidatePath) ? candidatePath : null;
  }

  const candidates = [
    ...IMPORT_RESOLUTION_EXTENSIONS.map((extension) => `${candidatePath}${extension}`),
    ...IMPORT_RESOLUTION_EXTENSIONS.map((extension) =>
      path.join(candidatePath, `index${extension}`)
    )
  ];

  return candidates.find((item) => existsSync(item)) ?? null;
}

async function resolveImportPath({
  filePath,
  source,
  repoRoot,
  configCache
}) {
  if (source.startsWith(".")) {
    const basePath = path.resolve(
      path.dirname(toFsPath(repoRoot, filePath)),
      source
    );
    const resolved = resolveImportCandidateToFile(basePath);
    return resolved ? toCliPath(repoRoot, resolved) : null;
  }

  const config = await findNearestPathConfig(filePath, repoRoot, configCache);
  if (!config) {
    return null;
  }

  const baseUrl = path.resolve(config.configDir, config.baseUrl ?? ".");
  for (const [pattern, targets] of Object.entries(config.paths ?? {})) {
    const captures = matchPathPattern(source, pattern);
    if (!captures || !Array.isArray(targets) || targets.length === 0) {
      continue;
    }

    for (const target of targets) {
      let replaced = target;
      for (const capture of captures) {
        replaced = replaced.replace("*", capture);
      }

      const candidate = path.resolve(baseUrl, replaced);
      const resolved = resolveImportCandidateToFile(candidate);
      if (resolved) {
        return toCliPath(repoRoot, resolved);
      }
    }
  }

  return null;
}

async function collectResolvedImports({
  filePath,
  imports,
  repoRoot,
  configCache
}) {
  const resolvedImports = [];
  for (const source of imports) {
    const resolved = await resolveImportPath({
      configCache,
      filePath,
      repoRoot,
      source
    });

    if (resolved) {
      resolvedImports.push(resolved);
    }
  }

  return resolvedImports;
}

async function collectSourceFiles(rootDirectory) {
  const sourceFiles = [];

  async function visit(currentDirectory) {
    const entries = await readdir(currentDirectory, {
      withFileTypes: true
    });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        await visit(path.join(currentDirectory, entry.name));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name);
      if (!SOURCE_EXTENSIONS.has(extension) || entry.name.endsWith(".d.ts")) {
        continue;
      }

      sourceFiles.push(path.join(currentDirectory, entry.name));
    }
  }

  await visit(rootDirectory);
  return sourceFiles;
}

async function buildImportIndex(repoRoot, configCache) {
  const importIndex = new Map();
  const sourceFiles = await collectSourceFiles(repoRoot);

  for (const sourceFile of sourceFiles) {
    const filePath = toCliPath(repoRoot, sourceFile);
    let content;
    try {
      content = await readFile(sourceFile, "utf8");
    } catch {
      continue;
    }

    let ast;
    try {
      ast = parseModule(filePath, content);
    } catch {
      continue;
    }

    const metadata = collectProgramMetadata(ast);
    const resolvedImports = await collectResolvedImports({
      configCache,
      filePath,
      imports: metadata.imports,
      repoRoot
    });

    for (const resolvedImport of resolvedImports) {
      if (!importIndex.has(resolvedImport)) {
        importIndex.set(resolvedImport, new Set());
      }

      importIndex.get(resolvedImport).add(filePath);
    }
  }

  return importIndex;
}

function getPublisherOwnershipCandidates({
  filePath,
  isDirectChild,
  parentBaseDir,
  resolvedImports
}) {
  if (isDirectChild) {
    return [filePath];
  }

  return resolvedImports.filter((importPath) => {
    const importSegments = splitCliPath(importPath);
    if (importSegments.length !== 5 || importSegments.at(-1) !== "index.tsx") {
      return false;
    }

    return importSegments.slice(0, 3).join("/") === parentBaseDir;
  });
}

function createOwnershipViolations({
  ownershipCandidates,
  importIndex,
  parentBaseDir
}) {
  const violations = [];

  for (const childPath of ownershipCandidates) {
    const importers = [...(importIndex.get(childPath) ?? new Set())]
      .filter((importer) => !importer.startsWith(`${parentBaseDir}/`));

    if (importers.length === 0) {
      continue;
    }

    const childName = splitCliPath(childPath).at(-2);
    const suggestedPath = `components/common/${childName}/index.tsx`;

    violations.push(
      createViolation(
        "PARENT_ONLY_CHILD_REUSED",
        "Parent-only child component is imported outside the parent component tree",
        {
          childPath,
          importers
        },
        `Move ${childPath} to ${suggestedPath}`
      )
    );
  }

  return violations;
}

async function analyzeSingleFile({
  role,
  profile,
  filePath,
  repoRoot,
  configCache
}) {
  const target = inferValidationTarget(role, filePath);
  const normalizedFilePath = target.file;
  const result = {
    file: normalizedFilePath,
    command: target.commandName,
    ok: true,
    violations: [...target.violations]
  };

  if (
    target.expectedEntryFileName &&
    splitCliPath(normalizedFilePath).at(-1) !== target.expectedEntryFileName
  ) {
    result.violations.push(
      createViolation(
        "INVALID_ENTRY_FILE_NAME",
        `Entry file name must be ${target.expectedEntryFileName}`,
        {
          expectedEntryFileName: target.expectedEntryFileName,
          file: normalizedFilePath
        }
      )
    );
  }

  if (!target.commandName) {
    result.ok = result.violations.length === 0;
    return result;
  }

  const absoluteFilePath = toFsPath(repoRoot, normalizedFilePath);
  if (!existsSync(absoluteFilePath)) {
    result.violations.push(
      createViolation(
        "FILE_NOT_FOUND",
        "Target file does not exist",
        {
          file: normalizedFilePath
        }
      )
    );
    result.ok = false;
    return result;
  }

  const pathValidation = await validateRequest({
    profile,
    commandName: target.commandName,
    args: target.validationArgs,
    files: [],
    repoRoot,
    collectViolations: true
  });
  result.violations.push(...pathValidation.violations);

  let content;
  try {
    content = await readFile(absoluteFilePath, "utf8");
  } catch (error) {
    result.violations.push(
      createViolation(
        "FILE_READ_FAILED",
        "Target file could not be read",
        {
          file: normalizedFilePath,
          reason: error instanceof Error ? error.message : String(error)
        }
      )
    );
    result.ok = false;
    return result;
  }

  const contentValidation = await validateRequest({
    profile,
    commandName: target.commandName,
    args: target.validationArgs,
    files: [
      {
        path: normalizedFilePath,
        content
      }
    ],
    repoRoot,
    collectViolations: true
  });
  result.violations.push(...contentValidation.violations);

  let ast;
  try {
    ast = parseModule(normalizedFilePath, content);
  } catch (error) {
    result.violations.push(
      createViolation(
        "TS_PARSE_ERROR",
        "Target file could not be parsed as TypeScript/TSX",
        {
          file: normalizedFilePath,
          reason: error instanceof Error ? error.message : String(error)
        }
      )
    );
    result.ok = false;
    return result;
  }

  const metadata = collectProgramMetadata(ast);
  result.violations.push(
    ...getNamedDefaultExportViolations({
      commandName: target.commandName,
      defaultExport: metadata.defaultExport,
      expectedName: target.expectedName,
      typeNames: metadata.typeNames
    })
  );

  if (target.commandName === "component") {
    result.violations.push(
      ...getTopLevelPublisherViolations(metadata.topLevelFunctions, target.expectedName)
    );
    result.violations.push(
      ...getPublisherStructureViolations(metadata.defaultExport, target.expectedName)
    );
  } else {
    result.violations.push(
      ...getFrontendStructureViolations(
        metadata.defaultExport,
        target.expectedName,
        metadata.topLevelFunctions
      )
    );
  }

  const resolvedImports = await collectResolvedImports({
    configCache,
    filePath: normalizedFilePath,
    imports: metadata.imports,
    repoRoot
  });

  result._ownershipCandidates = target.commandName === "component"
    ? getPublisherOwnershipCandidates({
        filePath: normalizedFilePath,
        isDirectChild: target.isDirectChild,
        parentBaseDir: target.parentBaseDir,
        resolvedImports
      })
    : [];
  result._parentBaseDir = target.parentBaseDir ?? null;
  result.ok = result.violations.length === 0;
  return result;
}

export async function validateFiles({
  role,
  profile,
  filePaths,
  repoRoot
}) {
  const configCache = new Map();
  const results = [];

  for (const filePath of filePaths.map((item) => normalizeCliPath(item))) {
    results.push(
      await analyzeSingleFile({
        configCache,
        filePath,
        profile,
        repoRoot,
        role
      })
    );
  }

  if (
    role === "publisher" &&
    results.some((result) => result._ownershipCandidates?.length > 0)
  ) {
    const importIndex = await buildImportIndex(repoRoot, configCache);
    for (const result of results) {
      if (!result._ownershipCandidates?.length || !result._parentBaseDir) {
        continue;
      }

      result.violations.push(
        ...createOwnershipViolations({
          importIndex,
          ownershipCandidates: result._ownershipCandidates,
          parentBaseDir: result._parentBaseDir
        })
      );
      result.ok = result.violations.length === 0;
    }
  }

  const publicResults = results.map((result) => ({
    command: result.command,
    file: result.file,
    ok: result.ok,
    violations: result.violations
  }));
  const failed = publicResults.filter((result) => !result.ok).length;

  return {
    ok: failed === 0,
    results: publicResults,
    summary: {
      failed,
      passed: publicResults.length - failed,
      total: publicResults.length
    }
  };
}
