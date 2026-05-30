import ts from "typescript";
import path from "node:path";
import { CODE_EXTENSIONS } from "./scan.mjs";
import { isTestPath } from "./profile.mjs";

const SCRIPT_KIND_BY_EXT = new Map([
  [".js", ts.ScriptKind.JS],
  [".jsx", ts.ScriptKind.JSX],
  [".ts", ts.ScriptKind.TS],
  [".tsx", ts.ScriptKind.TSX],
  [".mjs", ts.ScriptKind.JS],
  [".cjs", ts.ScriptKind.JS]
]);

const RESERVED_CALLS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "typeof",
  "new",
  "function",
  "class",
  "await",
  "describe",
  "it",
  "test"
]);

export function isCodeFile(relPath) {
  return CODE_EXTENSIONS.has(path.extname(relPath));
}

function scriptKind(relPath) {
  return SCRIPT_KIND_BY_EXT.get(path.extname(relPath)) || ts.ScriptKind.JS;
}

function hasExportModifier(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function symbolKind(name, declarationKind) {
  if (/^use[A-Z0-9]/.test(name)) return "hook";
  if (/^[A-Z]/.test(name) && declarationKind !== "type") return "component";
  if (declarationKind === "type") return "type";
  return "symbol";
}

function declarationName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : null;
}

function callName(expression) {
  if (ts.isIdentifier(expression)) return { name: expression.text, expression: expression.text };
  if (ts.isPropertyAccessExpression(expression)) {
    return {
      name: expression.name.text,
      expression: expression.getText()
    };
  }
  if (expression.kind === ts.SyntaxKind.ImportKeyword) return { name: "import", expression: "import" };
  return null;
}

function currentCaller(stack) {
  return stack.length ? stack[stack.length - 1] : null;
}

function addSymbol(symbols, node, name, declarationKind, relPath) {
  const id = `symbol:${relPath}#${name}`;
  symbols.push({
    id,
    name,
    label: name,
    kind: symbolKind(name, declarationKind),
    declaration_kind: declarationKind,
    exported: hasExportModifier(node)
  });
  return id;
}

function importedLocalNames(importClause) {
  const names = [];
  if (!importClause) return names;
  if (importClause.name) names.push({ local: importClause.name.text, imported: "default" });
  const namedBindings = importClause.namedBindings;
  if (!namedBindings) return names;
  if (ts.isNamespaceImport(namedBindings)) {
    names.push({ local: namedBindings.name.text, imported: "*" });
  } else if (ts.isNamedImports(namedBindings)) {
    for (const specifier of namedBindings.elements) {
      names.push({
        local: specifier.name.text,
        imported: specifier.propertyName?.text || specifier.name.text
      });
    }
  }
  return names;
}

export function parseCodeFile(relPath, text) {
  const sourceFile = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, scriptKind(relPath));
  const imports = [];
  const exports = [];
  const symbols = [];
  const calls = [];
  const routes = [];
  const symbolStack = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({
        specifier: node.moduleSpecifier.text,
        kind: "import",
        names: importedLocalNames(node.importClause)
      });
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ specifier: node.moduleSpecifier.text, kind: "export-from", names: [] });
      exports.push({ specifier: node.moduleSpecifier.text, kind: "export-from" });
    }

    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === "require" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        imports.push({ specifier: node.arguments[0].text, kind: "require", names: [] });
      } else if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        imports.push({ specifier: node.arguments[0].text, kind: "dynamic-import", names: [] });
      }

      const called = callName(node.expression);
      if (called && !RESERVED_CALLS.has(called.name)) {
        calls.push({
          name: called.name,
          expression: called.expression,
          caller: currentCaller(symbolStack),
          pos: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      }
    }

    let pushed = false;
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
      const name = declarationName(node);
      if (name) {
        const declarationKind = ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) ? "type" : "symbol";
        const id = addSymbol(symbols, node, name, declarationKind, relPath);
        symbolStack.push(id);
        pushed = true;
      }
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const name = declaration.name.text;
          const isLikelyEntry = hasExportModifier(node) || /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
          if (isLikelyEntry) addSymbol(symbols, node, name, "symbol", relPath);
        }
      }
    }

    ts.forEachChild(node, visit);
    if (pushed) symbolStack.pop();
  }

  visit(sourceFile);

  const route = detectRoute(relPath);
  if (route) routes.push(route);

  return {
    relPath,
    file_kind: "code",
    is_test: isTestPath(relPath),
    imports,
    exports,
    symbols,
    calls,
    routes,
    parse_diagnostics: sourceFile.parseDiagnostics.map((diagnostic) => ({
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
      pos: diagnostic.start ?? null
    }))
  };
}

function detectRoute(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (/^app\/.+\/page\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^app\//, "/").replace(/\/page\.(tsx|jsx|ts|js)$/, "");
  if (/^app\/api\/.+\/route\.(ts|js)$/.test(normalized)) return normalized.replace(/^app\/api\//, "/api/").replace(/\/route\.(ts|js)$/, "");
  if (/^src\/app\/.+\/page\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^src\/app\//, "/").replace(/\/page\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/app\/api\/.+\/route\.(ts|js)$/.test(normalized)) return normalized.replace(/^src\/app\/api\//, "/api/").replace(/\/route\.(ts|js)$/, "");
  if (/^pages\/.+\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^pages/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/pages\/.+\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^src\/pages/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/routes\/.+\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^src\/routes/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  return null;
}
