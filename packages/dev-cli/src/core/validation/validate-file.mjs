import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { parse } from "@babel/parser";

import {
  isRelativeCliPath,
  normalizeCliPath,
  splitCliPath
} from "../shared/path-utils.mjs";
import { createCliError } from "../shared/recipe-utils.mjs";
import { applyFieldResolvers, resolveCommandArgs } from "../execution/command-args-resolver.mjs";
import { renderTemplate, matchCliPathPatterns } from "../shared/path-patterns.mjs";
import { validateRequest } from "./command-validator.mjs";

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

function createValidationProfileConfigError(profile, validateCommand) {
  throw createCliError(
    "VALIDATION_PROFILE_CONFIG_ERROR",
    "validate-file target rules are missing or invalid for the active profile.",
    {
      profileId: profile.id,
      command: "validate-file",
      targetRules: validateCommand?.targetRules ?? null
    }
  );
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

function toFsPath(projectRoot, cliPath) {
  return path.join(projectRoot, ...splitCliPath(cliPath));
}

function toCliPath(projectRoot, filePath) {
  return normalizeCliPath(path.relative(projectRoot, filePath));
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

function isFrameworkSpecialPathSegment(segment) {
  return segment.startsWith("(") || segment.startsWith("[") || segment.startsWith("@");
}

function resolveExpectedEntryFileName(rule, context) {
  if (!rule.expectedEntryFileName) {
    return null;
  }

  if (typeof rule.expectedEntryFileName === "string") {
    return rule.expectedEntryFileName;
  }

  if (rule.expectedEntryFileName.source === "fileName") {
    return context.fileName;
  }

  throw createCliError(
    "INVALID_RECIPE",
    "Unsupported expected entry file resolver.",
    {
      expectedEntryFileName: rule.expectedEntryFileName
    }
  );
}

function matchesFileRule(rule, normalizedFilePath) {
  const fileName = splitCliPath(normalizedFilePath).at(-1) ?? "";
  const extension = path.extname(fileName);
  const match = rule.match ?? {};

  if (match.extensions?.length && !match.extensions.includes(extension)) {
    return null;
  }

  if (match.fileNames?.length && !match.fileNames.includes(fileName)) {
    return null;
  }

  if (match.excludeFileNames?.length && match.excludeFileNames.includes(fileName)) {
    return null;
  }

  if (match.pathPatterns?.length) {
    return matchCliPathPatterns(match.pathPatterns, normalizedFilePath);
  }

  return {
    pattern: null,
    path: normalizedFilePath,
    captures: {}
  };
}

async function buildValidationTarget(profile, rule, normalizedFilePath, captures, projectRoot) {
  const baseArgs = (await applyFieldResolvers({
    args: {},
    resolvers: rule.argMappings ?? [],
    projectRoot,
    context: {
      captures,
      filePath: normalizedFilePath
    },
    overwrite: true
  })).args;
  const command = profile.commands?.[rule.commandName];
  const resolvedCommand = command
    ? {
        name: rule.commandName,
        ...command
      }
    : null;
  const resolvedArgs = resolvedCommand
    ? (await resolveCommandArgs({
        command: resolvedCommand,
        args: baseArgs,
        projectRoot,
        context: {
          captures,
          filePath: normalizedFilePath
        }
      })).args
    : baseArgs;

  return {
    file: normalizedFilePath,
    matchedRule: true,
    commandName: rule.commandName ?? null,
    expectedEntryFileName: resolveExpectedEntryFileName(rule, {
      captures,
      fileName: splitCliPath(normalizedFilePath).at(-1) ?? ""
    }),
    expectedName: rule.exportPolicy?.expectedNameField
      ? resolvedArgs[rule.exportPolicy.expectedNameField] ?? null
      : null,
    validationArgs: resolvedArgs,
    exportPolicy: rule.exportPolicy ?? {},
    structureRules: rule.structureRules ?? [],
    pathRules: rule.pathRules ?? [],
    ownershipRule: rule.ownershipRule ?? null,
    runPlacementValidation: rule.runPlacementValidation !== false,
    violations: []
  };
}

async function inferValidationTarget(profile, rawFilePath, projectRoot, options = {}) {
  const includeUnsupportedViolation = options.includeUnsupportedViolation !== false;
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
      matchedRule: false,
      commandName: null,
      expectedEntryFileName: null,
      expectedName: null,
      validationArgs: {},
      exportPolicy: {},
      structureRules: [],
      pathRules: [],
      ownershipRule: null,
      violations
    };
  }

  const validateCommand = profile.commands?.validateFile ?? {};
  const targetRules = validateCommand.targetRules ?? [];

  if (!Array.isArray(targetRules) || targetRules.length === 0) {
    createValidationProfileConfigError(profile, validateCommand);
  }

  for (const rule of targetRules) {
    const matched = matchesFileRule(rule, normalizedFilePath);
    if (!matched) {
      continue;
    }

    const target = await buildValidationTarget(
      profile,
      rule,
      normalizedFilePath,
      matched.captures,
      projectRoot
    );

    return {
      file: normalizedFilePath,
      ...target,
      violations: [...violations, ...(target.violations ?? [])]
    };
  }

  return {
    file: normalizedFilePath,
    matchedRule: false,
    commandName: null,
    expectedEntryFileName: null,
    expectedName: null,
    validationArgs: {},
    exportPolicy: {},
    structureRules: [],
    pathRules: [],
    ownershipRule: null,
    violations: includeUnsupportedViolation
      ? [
          ...violations,
          createViolation(
            "UNSUPPORTED_VALIDATION_TARGET",
            validateCommand.unsupportedTargetMessage ?? "validate-file target is not supported by the active profile.",
            {
              file: normalizedFilePath
            }
          )
        ]
      : violations
  };
}

function getNamedDefaultExportViolations({
  defaultExport,
  expectedName,
  typeNames,
  enforceExportNameMatch = true
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

  if (
    enforceExportNameMatch &&
    defaultExport.name &&
    expectedName &&
    defaultExport.name !== expectedName
  ) {
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

  return violations;
}

function getForbiddenPatterns(profile, commandName) {
  const command = profile.commands?.[commandName];
  if (!command) {
    return [];
  }

  const validatorPatterns = (command.validatorRules ?? [])
    .filter((rule) => rule.kind === "forbiddenContentPatterns")
    .flatMap((rule) => rule.patterns ?? []);
  const contractPatterns = command.contracts?.logicBoundary?.forbiddenPatterns ?? [];

  return [...new Set([...validatorPatterns, ...contractPatterns])];
}

function getForbiddenPatternViolations(filePath, content, patterns) {
  return patterns
    .filter((pattern) => content.includes(pattern))
    .map((pattern) => createViolation(
      "FORBIDDEN_PATTERN",
      `Forbidden pattern found: ${pattern}`,
      {
        path: filePath,
        pattern
      }
    ));
}

function createRuleSuggestion(rule, values) {
  if (!rule.suggestionTemplate) {
    return undefined;
  }

  return renderTemplate(rule.suggestionTemplate, values);
}

function collectStructureDeclarations(metadata, includeNested) {
  const declarations = [...metadata.topLevelFunctions.values()];

  if (!includeNested || !metadata.defaultExport?.target?.node) {
    return declarations;
  }

  return [
    ...declarations,
    ...collectNestedFunctionLikeDeclarations(metadata.defaultExport.target.node.body)
  ];
}

function getStructureRuleViolations(metadata, expectedName, filePath, rules = []) {
  const violations = [];
  const entryName = metadata.defaultExport?.name ?? expectedName ?? null;

  for (const rule of rules) {
    if (rule.kind === "propsTypeSuffix") {
      if (!expectedName) {
        continue;
      }

      const expectedPropsType = `${expectedName}${rule.suffix ?? "Props"}`;
      if (!metadata.typeNames.has(expectedPropsType)) {
        violations.push(
          createViolation(
            rule.code ?? "MISSING_PROPS_TYPE",
            rule.message ?? `Entry file must define ${expectedPropsType}`,
            {
              expectedPropsType,
              file: filePath
            }
          )
        );
      }
      continue;
    }

    const declarations = collectStructureDeclarations(metadata, rule.includeNested !== false);
    for (const declaration of declarations) {
      if (declaration.name === entryName) {
        continue;
      }

      let matches = false;
      if (rule.kind === "forbidAdditionalHooks") {
        matches = declaration.name.startsWith(rule.prefix ?? "use");
      } else if (rule.kind === "forbidSubcomponents") {
        matches = functionReturnsJsx(declaration.node) && isPascalCaseName(declaration.name);
      } else if (rule.kind === "forbidJsxHelpers") {
        matches = functionReturnsJsx(declaration.node) && !isPascalCaseName(declaration.name);
      } else if (rule.kind === "forbidReactComponents") {
        matches = functionReturnsJsx(declaration.node) && isPascalCaseName(declaration.name);
      } else {
        continue;
      }

      if (!matches) {
        continue;
      }

      violations.push(
        createViolation(
          rule.code ?? "STRUCTURE_RULE_VIOLATION",
          rule.message ?? "Entry file violates a structure rule.",
          {
            entryName,
            file: filePath,
            name: declaration.name
          },
          createRuleSuggestion(rule, {
            entryName: entryName ?? "",
            expectedName: expectedName ?? "",
            filePath,
            name: declaration.name
          })
        )
      );
    }
  }

  return violations;
}

function isAllowedFileName(segment, rule) {
  if ((rule.allowedFileNames ?? []).includes(segment)) {
    return true;
  }

  const extension = path.extname(segment);
  const baseName = extension ? segment.slice(0, -extension.length) : segment;
  if ((rule.allowedFileBaseNames ?? []).includes(baseName)) {
    return true;
  }

  const style = rule.fileNameStyle ?? rule.style;
  if (style === "camel") {
    return /^[a-z][A-Za-z0-9]*$/.test(baseName);
  }

  if (style === "lower") {
    return /^[a-z][a-z0-9]*$/.test(baseName);
  }

  return true;
}

function shouldValidatePathRuleSegment(segments, segmentIndex, rule) {
  const isFileName = segmentIndex === segments.length - 1;
  if (isFileName) {
    return rule.includeFileName !== false;
  }

  if (!rule.skipAfterLastSegment) {
    return true;
  }

  const skipIndex = segments.lastIndexOf(rule.skipAfterLastSegment);
  if (skipIndex === -1) {
    return true;
  }

  return segmentIndex < skipIndex;
}

function getPathRuleViolations(normalizedFilePath, rules = []) {
  const violations = [];
  const segments = splitCliPath(normalizedFilePath);

  for (const rule of rules) {
    if (rule.kind !== "pathSegmentCase") {
      continue;
    }

    const predicate = rule.style === "lower"
      ? (segment) => /^[a-z][a-z0-9]*$/.test(segment)
      : (segment) => /^[a-z][A-Za-z0-9]*$/.test(segment);

    for (const [segmentIndex, segment] of segments.entries()) {
      if (!shouldValidatePathRuleSegment(segments, segmentIndex, rule)) {
        continue;
      }

      if (rule.skipFrameworkSpecialSegments !== false && isFrameworkSpecialPathSegment(segment)) {
        continue;
      }

      const isFileName = segmentIndex === segments.length - 1;
      const isValid = isFileName
        ? isAllowedFileName(segment, rule)
        : predicate(segment);

      if (isValid) {
        continue;
      }

      violations.push(
        createViolation(
          rule.code ?? "INVALID_PATH_SEGMENT",
          isFileName
            ? rule.fileMessage ?? rule.message ?? "File name does not match the required case policy."
            : rule.directoryMessage ?? rule.message ?? "Directory name does not match the required case policy.",
          {
            file: normalizedFilePath,
            segment
          }
        )
      );
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

async function findNearestPathConfig(filePath, projectRoot, cache) {
  let current = path.dirname(toFsPath(projectRoot, filePath));

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

    if (current === projectRoot) {
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
  projectRoot,
  configCache
}) {
  if (source.startsWith(".")) {
    const basePath = path.resolve(
      path.dirname(toFsPath(projectRoot, filePath)),
      source
    );
    const resolved = resolveImportCandidateToFile(basePath);
    return resolved ? toCliPath(projectRoot, resolved) : null;
  }

  const config = await findNearestPathConfig(filePath, projectRoot, configCache);
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
        return toCliPath(projectRoot, resolved);
      }
    }
  }

  return null;
}

async function collectResolvedImports({
  filePath,
  imports,
  projectRoot,
  configCache
}) {
  const resolvedImports = [];
  for (const source of imports) {
    const resolved = await resolveImportPath({
      configCache,
      filePath,
      projectRoot,
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

async function buildImportIndex(projectRoot, configCache) {
  const importIndex = new Map();
  const sourceFiles = await collectSourceFiles(projectRoot);

  for (const sourceFile of sourceFiles) {
    const filePath = toCliPath(projectRoot, sourceFile);
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
      projectRoot
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

function createSuggestedSharedComponentPath(childPath, ownershipRule) {
  const segments = splitCliPath(childPath);
  const componentsRoot = ownershipRule?.componentsRoot ?? "components";
  const sharedSegment = ownershipRule?.sharedSegment ?? "common";
  const entryFileName = ownershipRule?.entryFileName ?? "index.tsx";
  const componentsIndex = segments.lastIndexOf(componentsRoot);
  const childName = segments.at(-2);

  if (componentsIndex === -1 || !childName) {
    return childName
      ? `${componentsRoot}/${sharedSegment}/${childName}/${entryFileName}`
      : `${componentsRoot}/${sharedSegment}/${entryFileName}`;
  }

  return [
    ...segments.slice(0, componentsIndex + 1),
    sharedSegment,
    childName,
    entryFileName
  ].join("/");
}

function getOwnershipContext(filePath, ownershipRule, resolvedImports) {
  if (!ownershipRule || ownershipRule.kind !== "parentOnlyChildReuse") {
    return {
      ownershipCandidates: [],
      parentBaseDir: null
    };
  }

  const fileSegments = splitCliPath(filePath);
  const componentsRoot = ownershipRule.componentsRoot ?? "components";
  const componentsIndex = fileSegments.lastIndexOf(componentsRoot);
  const fullDirSegments = fileSegments.slice(0, -1);
  const scopedDirSegments = componentsIndex === -1
    ? []
    : fileSegments.slice(componentsIndex, -1);
  const entryFileNames = ownershipRule.entryFileNames ?? ["index.tsx"];
  const isDirectChild = scopedDirSegments.length === 4;
  const parentBaseDir = scopedDirSegments.length >= 4
    ? fullDirSegments.slice(0, -1).join("/")
    : fullDirSegments.join("/");

  if (isDirectChild) {
    return {
      ownershipCandidates: [filePath],
      parentBaseDir
    };
  }

  const ownershipCandidates = resolvedImports.filter((importPath) => {
    const importSegments = splitCliPath(importPath);
    const parentSegments = splitCliPath(parentBaseDir);

    if (!entryFileNames.includes(importSegments.at(-1) ?? "")) {
      return false;
    }

    if (importSegments.length !== parentSegments.length + 2) {
      return false;
    }

    return importSegments.slice(0, parentSegments.length).join("/") === parentBaseDir;
  });

  return {
    ownershipCandidates,
    parentBaseDir
  };
}

function createOwnershipViolations({
  ownershipCandidates,
  importIndex,
  parentBaseDir,
  ownershipRule
}) {
  const violations = [];

  for (const childPath of ownershipCandidates) {
    const importers = [...(importIndex.get(childPath) ?? new Set())]
      .filter((importer) => !importer.startsWith(`${parentBaseDir}/`));

    if (importers.length === 0) {
      continue;
    }

    const suggestedPath = ownershipRule?.suggestionTemplate
      ? renderTemplate(ownershipRule.suggestionTemplate, {
          childName: splitCliPath(childPath).at(-2) ?? "",
          childPath
        }, {
          normalizePath: true
        })
      : createSuggestedSharedComponentPath(childPath, ownershipRule);

    violations.push(
      createViolation(
        ownershipRule?.code ?? "PARENT_ONLY_CHILD_REUSED",
        ownershipRule?.message ?? "Parent-only child component is imported outside the parent component tree",
        {
          childPath,
          importers
        },
        ownershipRule?.moveMessageTemplate
          ? renderTemplate(ownershipRule.moveMessageTemplate, {
              childPath,
              suggestedPath
            })
          : `Move ${childPath} to ${suggestedPath}`
      )
    );
  }

  return violations;
}

async function analyzeSingleFile({
  profile,
  filePath,
  projectRoot,
  configCache,
  target: providedTarget
}) {
  const target = providedTarget ?? await inferValidationTarget(profile, filePath, projectRoot);
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

  result.violations.push(...getPathRuleViolations(normalizedFilePath, target.pathRules));

  if (!target.commandName) {
    result.ok = result.violations.length === 0;
    return result;
  }

  const absoluteFilePath = toFsPath(projectRoot, normalizedFilePath);
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

  if (target.runPlacementValidation !== false) {
    const pathValidation = await validateRequest({
      profile,
      commandName: target.commandName,
      args: target.validationArgs,
      files: [],
      projectRoot,
      collectViolations: true
    });
    result.violations.push(...pathValidation.violations);

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
      projectRoot,
      collectViolations: true
    });
    result.violations.push(...contentValidation.violations);
  } else {
    result.violations.push(
      ...getForbiddenPatternViolations(
        normalizedFilePath,
        content,
        getForbiddenPatterns(profile, target.commandName)
      )
    );
  }

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
      defaultExport: metadata.defaultExport,
      expectedName: target.expectedName,
      typeNames: metadata.typeNames,
      enforceExportNameMatch: target.exportPolicy.enforceExportNameMatch !== false
    })
  );
  result.violations.push(
    ...getStructureRuleViolations(
      metadata,
      target.expectedName,
      normalizedFilePath,
      target.structureRules
    )
  );

  const resolvedImports = await collectResolvedImports({
    configCache,
    filePath: normalizedFilePath,
    imports: metadata.imports,
    projectRoot
  });

  const ownershipContext = getOwnershipContext(
    normalizedFilePath,
    target.ownershipRule,
    resolvedImports
  );
  result._ownershipCandidates = ownershipContext.ownershipCandidates;
  result._parentBaseDir = ownershipContext.parentBaseDir;
  result._ownershipRule = target.ownershipRule;
  result.ok = result.violations.length === 0;
  return result;
}

function normalizeDiscoveryRoot(rawRoot) {
  const normalized = normalizeCliPath(String(rawRoot ?? "").trim());

  if (!isRelativeCliPath(normalized)) {
    throw createCliError(
      "INVALID_VALIDATE_FILE_DIRECTORY",
      "validate-file requires a relative repo directory path.",
      {
        directory: rawRoot
      }
    );
  }

  return normalized;
}

function collectSupportedPathPatterns(validateCommand) {
  const patterns = [
    ...(validateCommand.contracts?.pathPolicy?.requiredPatterns ?? []),
    ...((validateCommand.targetRules ?? [])
      .flatMap((rule) => rule.match?.pathPatterns ?? []))
  ];

  return [...new Set(patterns)].sort((left, right) => left.localeCompare(right));
}

function collectExampleDirectories(validateCommand) {
  const examples = validateCommand.examples ?? [];
  const directories = [];

  for (const example of examples) {
    const match = example.match(/validate-file\s+(.+)$/);
    const rawPath = match?.[1]?.trim();
    if (!rawPath || rawPath.startsWith("--")) {
      continue;
    }

    const normalized = normalizeCliPath(rawPath);
    if (!normalized) {
      continue;
    }

    const lastSegment = splitCliPath(normalized).at(-1) ?? "";
    if (path.extname(lastSegment)) {
      directories.push(splitCliPath(normalized).slice(0, -1).join("/"));
    } else {
      directories.push(normalized);
    }
  }

  return [...new Set(directories.filter(Boolean))];
}

function collectSupportedRoots(patterns, exampleDirectories) {
  const roots = new Set();

  for (const pattern of patterns) {
    for (const segment of splitCliPath(pattern)) {
      if (!segment.startsWith("{")) {
        roots.add(segment);
        break;
      }
    }
  }

  for (const directory of exampleDirectories) {
    const root = splitCliPath(directory)[0];
    if (root) {
      roots.add(root);
    }
  }

  return [...roots];
}

function createUnsupportedDirectoryError(validateCommand, directory) {
  const supportedPatterns = collectSupportedPathPatterns(validateCommand);
  const exampleDirectories = collectExampleDirectories(validateCommand);
  const supportedRoots = collectSupportedRoots(supportedPatterns, exampleDirectories);
  const suggestion = exampleDirectories[0]
    ? `Try validate-file ${exampleDirectories[0]}`
    : "Try a directory that contains profile-supported entry files.";

  throw createCliError(
    "UNSUPPORTED_VALIDATION_TARGET",
    validateCommand.unsupportedTargetMessage ?? "validate-file target is not supported by the active profile.",
    {
      directory,
      supportedPatterns,
      supportedRoots,
      exampleDirectories,
      suggestion
    }
  );
}

async function resolveDiscoveryTargets({
  profile,
  projectRoot,
  directoryPath
}) {
  const validateCommand = profile.commands?.validateFile ?? {};
  const targetRules = validateCommand.targetRules ?? [];

  if (!Array.isArray(targetRules) || targetRules.length === 0) {
    createValidationProfileConfigError(profile, validateCommand);
  }

  const normalizedRoot = normalizeDiscoveryRoot(directoryPath);
  const absoluteRoot = toFsPath(projectRoot, normalizedRoot);

  let rootStats;
  try {
    rootStats = await stat(absoluteRoot);
  } catch {
    throw createCliError(
      "VALIDATE_FILE_DIRECTORY_NOT_FOUND",
      "validate-file directory does not exist.",
      {
        directory: normalizedRoot
      }
    );
  }

  if (!rootStats.isDirectory()) {
    throw createCliError(
      "VALIDATE_FILE_DIRECTORY_ONLY",
      "validate-file accepts a directory path only.",
      {
        directory: normalizedRoot
      }
    );
  }

  const sourceFiles = (await collectSourceFiles(absoluteRoot))
    .sort((left, right) => left.localeCompare(right));
  const targets = [];

  const supportedPatterns = collectSupportedPathPatterns(validateCommand);
  const exampleDirectories = collectExampleDirectories(validateCommand);
  const supportedRoots = collectSupportedRoots(supportedPatterns, exampleDirectories);
  const discoveryRootSegment = splitCliPath(normalizedRoot)[0];
  const isUnderSupportedRoot = supportedRoots.includes(discoveryRootSegment);

  for (const sourceFile of sourceFiles) {
    const target = await inferValidationTarget(
      profile,
      toCliPath(projectRoot, sourceFile),
      projectRoot,
      {
        includeUnsupportedViolation: isUnderSupportedRoot
      }
    );

    if (isUnderSupportedRoot) {
      targets.push(target);
    } else if (target.matchedRule) {
      targets.push(target);
    }
  }

  if (targets.length === 0) {
    createUnsupportedDirectoryError(validateCommand, normalizedRoot);
  }

  const matchedCount = targets.filter((target) => target.matchedRule).length;

  return {
    discovery: {
      root: normalizedRoot,
      scanned: sourceFiles.length,
      matched: matchedCount,
      skipped: sourceFiles.length - matchedCount
    },
    targets
  };
}

export async function validateFiles({
  profile,
  directoryPath,
  projectRoot
}) {
  const configCache = new Map();
  const results = [];
  const resolved = await resolveDiscoveryTargets({
    profile,
    projectRoot,
    directoryPath
  });
  const discovery = resolved.discovery;
  const targets = [...resolved.targets];

  for (const target of targets) {
    results.push(
      await analyzeSingleFile({
        configCache,
        filePath: target.file,
        profile,
        projectRoot,
        target
      })
    );
  }

  if (results.some((result) => result._ownershipCandidates?.length > 0)) {
    const importIndex = await buildImportIndex(projectRoot, configCache);
    for (const result of results) {
      if (!result._ownershipCandidates?.length || !result._parentBaseDir || !result._ownershipRule) {
        continue;
      }

      result.violations.push(
        ...createOwnershipViolations({
          importIndex,
          ownershipCandidates: result._ownershipCandidates,
          ownershipRule: result._ownershipRule,
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

  const payload = {
    ok: failed === 0,
    results: publicResults,
    summary: {
      failed,
      passed: publicResults.length - failed,
      total: publicResults.length
    }
  };

  if (discovery) {
    payload.discovery = discovery;
  }

  return payload;
}
