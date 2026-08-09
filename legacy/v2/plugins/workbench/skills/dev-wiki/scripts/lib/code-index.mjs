import path from "node:path";
import { CODE_EXTENSIONS } from "./scan.mjs";

const REGEX_PREFIX_IDENTIFIERS = new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield"
]);
const CONTROL_CONDITION_IDENTIFIERS = new Set(["for", "if", "while", "with"]);
const STATEMENT_BOUNDARY_IDENTIFIERS = new Set([
  "class",
  "const",
  "export",
  "function",
  "import",
  "let",
  "return",
  "throw",
  "var"
]);

export function isCodeFile(relPath) {
  return CODE_EXTENSIONS.has(path.extname(relPath));
}

function isIdentifierStart(character) {
  return /[A-Za-z_$]/.test(character);
}

function isIdentifierPart(character) {
  return /[A-Za-z0-9_$]/.test(character);
}

function decodeQuotedValue(raw) {
  let value = "";
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== "\\" || index + 1 >= raw.length) {
      value += raw[index];
      continue;
    }

    index += 1;
    const escaped = raw[index];
    const simpleEscapes = {
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
      v: "\v"
    };

    if (Object.hasOwn(simpleEscapes, escaped)) {
      value += simpleEscapes[escaped];
    } else if (escaped === "\n") {
      continue;
    } else if (escaped === "\r") {
      if (raw[index + 1] === "\n") index += 1;
    } else if (escaped === "x") {
      const hex = raw.slice(index + 1, index + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return null;
      value += String.fromCharCode(Number.parseInt(hex, 16));
      index += 2;
    } else if (escaped === "u" && raw[index + 1] === "{") {
      const close = raw.indexOf("}", index + 2);
      if (close < 0) return null;
      const hex = raw.slice(index + 2, close);
      const codePoint = Number.parseInt(hex, 16);
      if (!/^[0-9A-Fa-f]+$/.test(hex) || codePoint > 0x10ffff) return null;
      value += String.fromCodePoint(codePoint);
      index = close;
    } else if (escaped === "u") {
      const hex = raw.slice(index + 1, index + 5);
      if (!/^[0-9A-Fa-f]{4}$/.test(hex)) return null;
      value += String.fromCharCode(Number.parseInt(hex, 16));
      index += 4;
    } else if (escaped === "0") {
      if (/[0-9]/.test(raw[index + 1] || "")) return null;
      value += "\0";
    } else if (/[1-9]/.test(escaped)) {
      return null;
    } else {
      value += escaped;
    }
  }
  return value;
}

function followsControlCondition(tokens) {
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (isToken(token, "punctuation", ")")) {
      depth += 1;
    } else if (isToken(token, "punctuation", "(")) {
      depth -= 1;
      if (depth === 0) {
        const before = tokens[index - 1];
        const propertyOperator = tokens[index - 2];
        return (
          before?.type === "identifier" &&
          CONTROL_CONDITION_IDENTIFIERS.has(before.value) &&
          !isToken(propertyOperator, "punctuation", ".")
        );
      }
    }
  }
  return false;
}

function canStartRegex(tokens) {
  const previousToken = tokens[tokens.length - 1];
  if (!previousToken) return true;
  if (previousToken.type === "identifier") {
    return (
      REGEX_PREFIX_IDENTIFIERS.has(previousToken.value) &&
      !isToken(tokens[tokens.length - 2], "punctuation", ".")
    );
  }
  if (previousToken.type !== "punctuation") return false;
  if (previousToken.value === ")") return followsControlCondition(tokens);
  if (previousToken.value === ">" && tokens[tokens.length - 2]?.value === "=") return true;
  return /[([{,:;=!?&|+\-*%^~]/.test(previousToken.value);
}

function readQuotedToken(text, startIndex) {
  const quote = text[startIndex];
  let raw = "";
  let index = startIndex + 1;

  while (index < text.length) {
    const current = text[index];
    if (current === "\\" && index + 1 < text.length) {
      raw += current + text[index + 1];
      index += 2;
      if (raw.endsWith("\\\r") && text[index] === "\n") {
        raw += text[index];
        index += 1;
      }
      continue;
    }
    if (current === quote) {
      const value = decodeQuotedValue(raw);
      return {
        index: index + 1,
        token: value === null ? { type: "invalid-string", value: null } : { type: "string", value }
      };
    }
    raw += current;
    index += 1;
  }

  return { index, token: { type: "invalid-string", value: null } };
}

function isLikelyJsxStart(text, index, tokens) {
  const next = text[index + 1];
  if (!(next === ">" || /[A-Za-z_$]/.test(next || ""))) return false;

  let nameEnd = index + 1;
  while (/[A-Za-z0-9_$:.-]/.test(text[nameEnd] || "")) nameEnd += 1;
  let headCursor = nameEnd;
  while (/\s/.test(text[headCursor] || "")) headCursor += 1;
  if (text[headCursor] === "," || text[headCursor] === "=") return false;
  if (text.slice(headCursor).startsWith("extends") && !isIdentifierPart(text[headCursor + "extends".length] || "")) return false;

  const tagEnd = text.indexOf(">", nameEnd);
  if (tagEnd < 0) return false;
  const afterTag = text.slice(tagEnd + 1, tagEnd + 1000);
  if (/^\s*\([^)]*\)\s*=>/.test(afterTag)) return false;

  const previous = tokens[tokens.length - 1];
  if (!previous) return true;
  if (previous.type === "identifier") return ["case", "default", "return", "yield"].includes(previous.value);
  if (previous.type !== "punctuation") return false;
  if (previous.value === ">" && tokens[tokens.length - 2]?.value === "=") return true;
  return /[([{=,:;!?&|]/.test(previous.value);
}

// This lexer recognizes only the boundaries needed for module references. JSX
// text and template text are skipped, while their JavaScript expressions are
// scanned recursively. It does not build a syntax tree or validate source code.
function tokenizeModuleSyntax(text, relPath) {
  const tokens = [];
  const allowJsx = /\.(?:[cm]?js|jsx|tsx)$/.test(relPath);

  function scanTemplate(startIndex) {
    let index = startIndex + 1;
    while (index < text.length) {
      if (text[index] === "\\" && index + 1 < text.length) {
        index += 2;
      } else if (text[index] === "`") {
        return index + 1;
      } else if (text[index] === "$" && text[index + 1] === "{") {
        index = scanJavaScript(index + 2, true);
      } else {
        index += 1;
      }
    }
    return index;
  }

  function scanJsxElement(startIndex) {
    let index = startIndex + 1;
    if (text[index] === ">") {
      index += 1;
    } else {
      while (/[A-Za-z0-9_$:.-]/.test(text[index] || "")) index += 1;
      while (index < text.length) {
        if (text[index] === "'" || text[index] === '"') {
          index = readQuotedToken(text, index).index;
        } else if (text[index] === "{") {
          index = scanJavaScript(index + 1, true);
        } else if (text[index] === "/" && text[index + 1] === ">") {
          return index + 2;
        } else if (text[index] === ">") {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }
    }

    while (index < text.length) {
      if (text[index] === "<" && text[index + 1] === "/") {
        const close = text.indexOf(">", index + 2);
        return close < 0 ? text.length : close + 1;
      }
      if (text[index] === "<" && (text[index + 1] === ">" || /[A-Za-z_$]/.test(text[index + 1] || ""))) {
        index = scanJsxElement(index);
        continue;
      }
      if (text[index] === "{") {
        index = scanJavaScript(index + 1, true);
        continue;
      }
      index += 1;
    }
    return index;
  }

  function scanJavaScript(startIndex, stopAtClosingBrace = false) {
    let index = startIndex;
    let braceDepth = 0;

    while (index < text.length) {
      const character = text[index];

      if (index === 0 && character === "#" && text[index + 1] === "!") {
        index += 2;
        while (index < text.length && text[index] !== "\n") index += 1;
        continue;
      }

      if (/\s/.test(character)) {
        index += 1;
        continue;
      }

      if (character === "/" && text[index + 1] === "/") {
        index += 2;
        while (index < text.length && text[index] !== "\n") index += 1;
        continue;
      }

      if (character === "/" && text[index + 1] === "*") {
        index += 2;
        while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) index += 1;
        index = Math.min(index + 2, text.length);
        continue;
      }

      if (character === "'" || character === '"') {
        const quoted = readQuotedToken(text, index);
        tokens.push(quoted.token);
        index = quoted.index;
        continue;
      }

      if (character === "`") {
        index = scanTemplate(index);
        tokens.push({ type: "value", value: "template" });
        continue;
      }

      if (allowJsx && character === "<" && isLikelyJsxStart(text, index, tokens)) {
        index = scanJsxElement(index);
        tokens.push({ type: "value", value: "jsx" });
        continue;
      }

      if (character === "/" && canStartRegex(tokens)) {
        let inCharacterClass = false;
        index += 1;
        while (index < text.length) {
          const current = text[index];
          if (current === "\\" && index + 1 < text.length) {
            index += 2;
            continue;
          }
          if (current === "[") inCharacterClass = true;
          else if (current === "]") inCharacterClass = false;
          else if (current === "/" && !inCharacterClass) {
            index += 1;
            while (/[A-Za-z]/.test(text[index] || "")) index += 1;
            break;
          }
          index += 1;
        }
        tokens.push({ type: "value", value: "regex" });
        continue;
      }

      if (isIdentifierStart(character)) {
        const start = index;
        index += 1;
        while (index < text.length && isIdentifierPart(text[index])) index += 1;
        tokens.push({ type: "identifier", value: text.slice(start, index) });
        continue;
      }

      if (character === "{") {
        braceDepth += 1;
        tokens.push({ type: "punctuation", value: character });
        index += 1;
        continue;
      }

      if (character === "}") {
        if (stopAtClosingBrace && braceDepth === 0) return index + 1;
        braceDepth = Math.max(0, braceDepth - 1);
        tokens.push({ type: "punctuation", value: character });
        index += 1;
        continue;
      }

      tokens.push({ type: "punctuation", value: character });
      index += 1;
    }
    return index;
  }

  scanJavaScript(0);
  return tokens;
}

function isToken(token, type, value) {
  return token?.type === type && token.value === value;
}

function findFromSpecifier(tokens, startIndex) {
  let braceDepth = 0;
  for (let index = startIndex; index < Math.min(tokens.length, startIndex + 200); index += 1) {
    const token = tokens[index];
    if (isToken(token, "punctuation", "{")) braceDepth += 1;
    else if (isToken(token, "punctuation", "}")) braceDepth = Math.max(0, braceDepth - 1);
    else if (braceDepth === 0 && isToken(token, "punctuation", ";")) return null;
    else if (braceDepth === 0 && token.type === "identifier" && STATEMENT_BOUNDARY_IDENTIFIERS.has(token.value)) return null;
    else if (braceDepth === 0 && isToken(token, "identifier", "from")) {
      return tokens[index + 1]?.type === "string" ? tokens[index + 1].value : null;
    }
  }
  return null;
}

function scanModuleReferences(relPath, text) {
  const tokens = tokenizeModuleSyntax(text, relPath);
  const imports = [];
  const exports = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];

    if (isToken(token, "identifier", "import") && !isToken(previous, "punctuation", ".")) {
      if (isToken(tokens[index + 1], "punctuation", "(")) {
        if (tokens[index + 2]?.type === "string") {
          imports.push({ specifier: tokens[index + 2].value, kind: "dynamic-import", names: [] });
        }
      } else if (tokens[index + 1]?.type === "string") {
        imports.push({ specifier: tokens[index + 1].value, kind: "import", names: [] });
      } else if (tokens[index + 1]?.type === "invalid-string") {
        continue;
      } else {
        const specifier = findFromSpecifier(tokens, index + 1);
        if (specifier) imports.push({ specifier, kind: "import", names: [] });
      }
      continue;
    }

    if (isToken(token, "identifier", "export")) {
      const specifier = findFromSpecifier(tokens, index + 1);
      if (specifier) {
        imports.push({ specifier, kind: "export-from", names: [] });
        exports.push({ specifier, kind: "export-from" });
      }
      continue;
    }

    if (
      isToken(token, "identifier", "require") &&
      !isToken(previous, "punctuation", ".") &&
      isToken(tokens[index + 1], "punctuation", "(") &&
      tokens[index + 2]?.type === "string"
    ) {
      imports.push({ specifier: tokens[index + 2].value, kind: "require", names: [] });
    }
  }

  return { imports, exports };
}

export function parseCodeFile(relPath, text) {
  const { imports, exports } = scanModuleReferences(relPath, text);
  const route = detectRoute(relPath);

  return {
    relPath,
    file_kind: "code",
    is_test: isTestPath(relPath),
    imports,
    exports,
    symbols: [],
    calls: [],
    routes: route ? [route] : [],
    parse_diagnostics: []
  };
}

function isTestPath(relPath) {
  return /(^|\/)(__tests__|test|tests)\//.test(relPath) || /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(relPath);
}

function detectRoute(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (/^app\/page\.(tsx|jsx|ts|js)$/.test(normalized)) return "/";
  if (/^src\/app\/page\.(tsx|jsx|ts|js)$/.test(normalized)) return "/";
  if (/^app\/.+\/page\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^app\//, "/").replace(/\/page\.(tsx|jsx|ts|js)$/, "");
  if (/^app\/api\/.+\/route\.(ts|js)$/.test(normalized)) return normalized.replace(/^app\/api\//, "/api/").replace(/\/route\.(ts|js)$/, "");
  if (/^src\/app\/.+\/page\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^src\/app\//, "/").replace(/\/page\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/app\/api\/.+\/route\.(ts|js)$/.test(normalized)) return normalized.replace(/^src\/app\/api\//, "/api/").replace(/\/route\.(ts|js)$/, "");
  if (/^pages\/.+\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^pages/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/pages\/.+\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^src\/pages/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/routes\/.+\.(tsx|jsx|ts|js)$/.test(normalized)) return normalized.replace(/^src\/routes/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  return null;
}
