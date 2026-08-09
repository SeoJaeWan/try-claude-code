import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TextDecoder } from "node:util";

const DEFAULT_MAX_SOURCE_BYTES = 128 * 1024;
const MAX_HOOK_INPUT_BYTES = 512 * 1024;
const MAX_NORMALIZED_COMMAND_BYTES = 8 * 1024;
const PRIVATE_KEY_PATTERN = /-----BEGIN (?:(?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/iu;
const SENSITIVE_NAME = String.raw`(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|client[_-]?secret|access[_-]?token|refresh[_-]?token)`;
const FILE_EXTENSIONS = new Set([
  ".bash", ".cjs", ".cts", ".js", ".mjs", ".mts", ".py", ".rb", ".sh", ".ts", ".zsh"
]);
const BLOCKED_DIRECTORIES = new Set([".git", "node_modules", "vendor"]);
const INTERPRETERS = {
  node: "node",
  nodejs: "node",
  python: "python",
  python2: "python",
  python3: "python",
  ruby: "ruby",
  bash: "shell",
  sh: "shell",
  zsh: "shell"
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function defaultCollectionRoot() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return path.resolve(codexHome, "workbench", "llm-script");
}

async function readJsonObject(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/u, ""));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function commandFromPayload(payload) {
  const candidates = [
    payload?.tool_input?.command,
    payload?.tool_input?.cmd,
    payload?.tool_input?.args?.command,
    payload?.tool_input?.args?.cmd,
    payload?.command,
    payload?.cmd,
    payload?.shell_command,
    payload?.args?.command,
    payload?.args?.cmd
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

export function parseHookPayload(input) {
  let payload = input;
  if (typeof payload === "string") {
    if (Buffer.byteLength(payload) > MAX_HOOK_INPUT_BYTES) return null;
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!isObject(payload)) return null;
  if (payload.hook_event_name && payload.hook_event_name !== "PostToolUse") return null;
  if (payload.tool_name && payload.tool_name !== "Bash") return null;

  const command = commandFromPayload(payload);
  const cwdCandidates = [
    payload?.tool_input?.workdir,
    payload?.tool_input?.cwd,
    payload?.tool_input?.args?.workdir,
    payload?.tool_input?.args?.cwd,
    payload?.workdir,
    payload?.cwd
  ];
  const cwd = cwdCandidates.find((value) => typeof value === "string" && path.isAbsolute(value));
  if (!command || !cwd) return null;
  return { command, cwd };
}

async function resolveWorkspace(cwd, workspaceIndex) {
  let canonicalCwd;
  try {
    canonicalCwd = await realpath(cwd);
    if (!(await stat(canonicalCwd)).isDirectory()) return null;
  } catch {
    return null;
  }

  const entries = isObject(workspaceIndex?.workspaces)
    ? Object.entries(workspaceIndex.workspaces)
    : [];
  const matches = [];
  for (const [workspacePath, mapping] of entries) {
    if (!isObject(mapping) || mapping.capture !== true || !path.isAbsolute(workspacePath)) continue;
    try {
      const canonicalRoot = await realpath(workspacePath);
      if (isInside(canonicalRoot, canonicalCwd)) {
        matches.push({ root: canonicalRoot, mapping });
      }
    } catch {
      // A stale mapping must not make the hook fail.
    }
  }
  matches.sort((left, right) => right.root.length - left.root.length);
  return matches[0] ? { ...matches[0], cwd: canonicalCwd } : null;
}

function tokenizeShell(source) {
  const tokens = [];
  let value = "";
  let raw = "";
  let dynamic = false;
  let quoted = false;

  const pushWord = () => {
    if (!raw && !value) return;
    tokens.push({ type: "word", value, raw, dynamic, quoted });
    value = "";
    raw = "";
    dynamic = false;
    quoted = false;
  };

  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (character === " " || character === "\t" || character === "\r") {
      pushWord();
      index += 1;
      continue;
    }
    if (character === "\n") {
      pushWord();
      tokens.push({ type: "op", value: "\n" });
      index += 1;
      continue;
    }
    if (character === "#" && !raw) {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (character === "'" || character === "\"") {
      const quote = character;
      quoted = true;
      raw += character;
      index += 1;
      let closed = false;
      while (index < source.length) {
        const next = source[index];
        raw += next;
        if (next === quote) {
          index += 1;
          closed = true;
          break;
        }
        if (quote === "\"" && next === "\\" && index + 1 < source.length) {
          raw += source[index + 1];
          const escaped = source[index + 1];
          if (escaped !== "\n") {
            value += ["$", "`", "\"", "\\"].includes(escaped)
              ? escaped
              : `\\${escaped}`;
          }
          index += 2;
          continue;
        }
        if (quote === "\"" && (next === "$" || next === "`")) dynamic = true;
        value += next;
        index += 1;
      }
      if (!closed) dynamic = true;
      continue;
    }
    if (character === "\\" && index + 1 < source.length) {
      raw += `${character}${source[index + 1]}`;
      value += source[index + 1];
      index += 2;
      continue;
    }

    const pair = source.slice(index, index + 2);
    if (["&&", "||", "<<", ">>"].includes(pair)) {
      pushWord();
      tokens.push({ type: "op", value: pair });
      index += 2;
      continue;
    }
    if ([";", "|", "&", "(", ")", "<", ">"].includes(character)) {
      pushWord();
      tokens.push({ type: "op", value: character });
      index += 1;
      continue;
    }
    if (character === "$" || character === "`" || character === "*" || character === "?") {
      dynamic = true;
    }
    raw += character;
    value += character;
    index += 1;
  }
  pushWord();
  return tokens;
}

function splitSegments(tokens) {
  const separators = new Set([";", "\n", "&&", "||", "|", "&"]);
  const segments = [];
  let words = [];
  let before = null;
  for (const token of tokens) {
    if (token.type === "op" && separators.has(token.value)) {
      if (words.length) segments.push({ words, before });
      words = [];
      before = token.value;
      continue;
    }
    if (token.type === "op") {
      words.push({ type: "word", value: token.value, raw: token.value, dynamic: true, quoted: false });
    } else {
      words.push(token);
    }
  }
  if (words.length) segments.push({ words, before });
  return segments;
}

function stripWrappers(words) {
  let index = 0;
  while (index < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/u.test(words[index].value)) index += 1;
  if (words[index]?.value === "env") {
    index += 1;
    while (index < words.length) {
      const value = words[index].value;
      if (/^[A-Za-z_][A-Za-z0-9_]*=/u.test(value) || value === "-i" || value === "--ignore-environment") {
        index += 1;
      } else if (value === "-u" || value === "--unset") {
        index += 2;
      } else {
        break;
      }
    }
  }
  if (words[index]?.value === "command" || words[index]?.value === "exec") {
    index += 1;
    while (words[index]?.value?.startsWith("-")) index += 1;
  }
  return words.slice(index);
}

function interpreterFor(token) {
  if (!token || token.dynamic) return null;
  const base = path.basename(token.value).toLowerCase();
  if (/^python(?:\d+(?:\.\d+)*)?$/u.test(base)) return "python";
  return INTERPRETERS[base] || null;
}

function languageFor(runtime, filePath = "") {
  const extension = path.extname(filePath).toLowerCase();
  if ([".ts", ".mts", ".cts"].includes(extension)) return "typescript";
  if ([".js", ".mjs", ".cjs"].includes(extension)) return "javascript";
  if (extension === ".py" || runtime === "python") return "python";
  if (extension === ".rb" || runtime === "ruby") return "ruby";
  if ([".sh", ".bash", ".zsh"].includes(extension) || runtime === "shell") return "shell";
  return runtime === "node" ? "javascript" : "text";
}

function quoteCommandWord(value) {
  return /^[A-Za-z0-9_./:@%+,=~-]+$/u.test(value) ? value : JSON.stringify(value);
}

function sensitiveFlag(value) {
  return /^--?(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|client[_-]?secret|access[_-]?token|refresh[_-]?token)$/iu.test(value);
}

function normalizeFileCommand(candidate, canonicalFile, runtime, context) {
  const words = Array.isArray(candidate.commandWords) ? candidate.commandWords : [];
  if (!words.length) {
    return `${runtime} ${slash(path.relative(candidate.cwd, canonicalFile))}`;
  }

  const normalized = [];
  let redactNext = false;
  for (let index = 0; index < words.length; index += 1) {
    const token = words[index];
    let value;
    if (index === 0) {
      value = path.basename(token.value);
    } else if (index === candidate.pathIndex) {
      value = slash(path.relative(candidate.cwd, canonicalFile));
    } else if (redactNext) {
      value = "<redacted>";
      redactNext = false;
    } else if (token.dynamic) {
      value = "<dynamic>";
    } else if (sensitiveFlag(token.value)) {
      value = token.value;
      redactNext = true;
    } else if (/^--?(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|client[_-]?secret|access[_-]?token|refresh[_-]?token)=/iu.test(token.value)) {
      value = `${token.value.slice(0, token.value.indexOf("=") + 1)}<redacted>`;
    } else if (path.isAbsolute(token.value)) {
      const normalizedPath = path.normalize(token.value);
      value = isInside(context.workspaceRoot, normalizedPath)
        ? slash(path.relative(candidate.cwd, normalizedPath))
        : normalizedPath.startsWith(os.homedir())
          ? normalizedPath.replace(os.homedir(), "<home>")
          : "<absolute-path>";
    } else {
      const sanitized = redactText(token.value);
      value = sanitized ? sanitized.text : "<redacted>";
    }
    normalized.push(quoteCommandWord(value));
    if (Buffer.byteLength(normalized.join(" "), "utf8") > MAX_NORMALIZED_COMMAND_BYTES) {
      normalized.pop();
      normalized.push("<truncated>");
      break;
    }
  }
  return normalized.join(" ");
}

function sensitiveFilePath(filePath) {
  const parts = filePath.split(path.sep).map((part) => part.toLowerCase());
  if (parts.some((part) => BLOCKED_DIRECTORIES.has(part))) return true;
  const base = parts.at(-1) || "";
  return (
    /^\.env(?:\.|$)/u.test(base) ||
    [".netrc", ".npmrc", "credentials", "credentials.json", "id_rsa", "id_ed25519"].includes(base) ||
    /(?:^|[._-])(?:private[_-]?key|credentials?)(?:[._-]|$)/u.test(base) ||
    /\.(?:pem|key|p12|pfx|crt|cer)$/u.test(base)
  );
}

function redactText(text) {
  if (PRIVATE_KEY_PATTERN.test(text)) return null;
  let output = text;
  const assignment = new RegExp(
    `((?:["']?[A-Za-z0-9_-]*${SENSITIVE_NAME}[A-Za-z0-9_-]*["']?)\\s*[:=]\\s*)(["'])([^\\n"']+)\\2`,
    "giu"
  );
  output = output.replace(assignment, (_match, prefix, quote) => `${prefix}${quote}<redacted>${quote}`);
  const templateAssignment = new RegExp(
    `((?:["']?[A-Za-z0-9_-]*${SENSITIVE_NAME}[A-Za-z0-9_-]*["']?)\\s*[:=]\\s*)\\x60([^\\n\\x60]+)\\x60`,
    "giu"
  );
  output = output.replace(templateAssignment, "$1`<redacted>`");
  output = output.replace(
    /(\b[A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|AUTHORIZATION|COOKIE|CLIENT_SECRET)[A-Z0-9_]*=)[^\s;|&]+/giu,
    "$1<redacted>"
  );
  output = output.replace(
    /(--(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|client[_-]?secret|access[_-]?token|refresh[_-]?token)(?:=|\s+))[^\s;|&]+/giu,
    "$1<redacted>"
  );
  output = output.replace(
    /(\b(?:Authorization|Proxy-Authorization|Cookie|Set-Cookie|X-Api-Key)\s*:\s*)[^\r\n"']+/giu,
    "$1<redacted>"
  );
  output = output.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/giu, "Bearer <redacted>");
  output = output.replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{20,})\b/gu, "<redacted>");
  output = output.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu, "<redacted>");
  output = output.replace(/([A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/:@]+:)[^\s/@]+(@)/giu, "$1<redacted>$2");
  output = output.replace(
    new RegExp(`([?&]${SENSITIVE_NAME}=)[^&#\\s"']+`, "giu"),
    "$1<redacted>"
  );
  const homeDirectory = os.homedir();
  if (homeDirectory && output.includes(homeDirectory)) {
    output = output.split(homeDirectory).join("<home>");
  }
  return { text: output, redacted: output !== text };
}

async function snapshotFile(candidate, context) {
  if (!candidate.pathToken || candidate.pathToken.dynamic) return null;
  const suppliedPath = candidate.pathToken.value;
  if (!suppliedPath || suppliedPath === "-" || /[\0\n\r]/u.test(suppliedPath)) return null;
  const resolved = path.isAbsolute(suppliedPath)
    ? path.normalize(suppliedPath)
    : path.resolve(candidate.cwd, suppliedPath);

  let canonical;
  let fileStat;
  try {
    canonical = await realpath(resolved);
    fileStat = await stat(canonical);
  } catch {
    return null;
  }
  if (!fileStat.isFile() || !isInside(context.workspaceRoot, canonical)) return null;
  if (sensitiveFilePath(canonical) || fileStat.size > context.maxSourceBytes) return null;

  let buffer;
  let handle;
  try {
    handle = await open(canonical, "r");
    const bounded = Buffer.allocUnsafe(context.maxSourceBytes + 1);
    const { bytesRead } = await handle.read(bounded, 0, bounded.length, 0);
    buffer = bounded.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
  if (buffer.length > context.maxSourceBytes || buffer.includes(0)) return null;
  let code;
  try {
    code = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
  const sanitized = redactText(code);
  if (!sanitized) return null;

  const relativePath = slash(path.relative(context.workspaceRoot, canonical));
  let runtime = candidate.runtime;
  if (runtime === "script") {
    const firstLine = code.split(/\r?\n/u, 1)[0];
    if (/^#!.*\bpython/u.test(firstLine)) runtime = "python";
    else if (/^#!.*\bruby/u.test(firstLine)) runtime = "ruby";
    else if (/^#!.*\b(?:ba|z)?sh\b/u.test(firstLine)) runtime = "shell";
    else if (/^#!.*\bnode\b/u.test(firstLine)) runtime = "node";
    else runtime = "script";
  }

  return {
    runtime,
    command: normalizeFileCommand(candidate, canonical, runtime, context),
    executionCwd: candidate.cwd,
    source: {
      kind: "file",
      path: relativePath,
      language: languageFor(runtime, relativePath),
      redacted: sanitized.redacted,
      code: sanitized.text
    }
  };
}

function inlineCapture(runtime, executable, codeToken, flag, maxSourceBytes) {
  if (!codeToken || codeToken.dynamic || typeof codeToken.value !== "string") return null;
  if (Buffer.byteLength(codeToken.value, "utf8") > maxSourceBytes) return null;
  const sanitized = redactText(codeToken.value);
  if (!sanitized) return null;
  return {
    runtime,
    command: `${executable} ${flag} <inline>`,
    source: {
      kind: "inline",
      path: null,
      language: languageFor(runtime),
      redacted: sanitized.redacted,
      code: sanitized.text
    }
  };
}

function fileCandidate(runtime, pathToken, cwd, commandWords, pathIndex) {
  return { kind: "file", runtime, pathToken, cwd, commandWords, pathIndex };
}

function parseInterpreter(words, cwd, heredoc, maxSourceBytes) {
  const unwrapped = stripWrappers(words);
  if (!unwrapped.length) return null;
  const runtime = interpreterFor(unwrapped[0]);
  if (!runtime) {
    const direct = unwrapped[0];
    if (!direct.dynamic && (direct.value.includes("/") || FILE_EXTENSIONS.has(path.extname(direct.value).toLowerCase()))) {
      return fileCandidate("script", direct, cwd, unwrapped, 0);
    }
    return null;
  }
  const executable = path.basename(unwrapped[0].value);

  const args = unwrapped.slice(1);
  if (runtime === "python") {
    for (let index = 0; index < args.length; index += 1) {
      const token = args[index];
      if (token.value === "-m" || token.value.startsWith("-m")) return null;
      if (token.value === "-c") return { kind: "capture", value: inlineCapture(runtime, executable, args[index + 1], "-c", maxSourceBytes) };
      if (token.value.startsWith("-c") && token.value.length > 2) {
        return { kind: "capture", value: inlineCapture(runtime, executable, { ...token, value: token.value.slice(2) }, "-c", maxSourceBytes) };
      }
      if (token.value === "-W" || token.value === "-X") {
        index += 1;
        continue;
      }
      if (token.value === "-" && heredoc) return { kind: "heredoc", runtime, executable };
      if (!token.value.startsWith("-")) return fileCandidate(runtime, token, cwd, unwrapped, index + 1);
    }
  } else if (runtime === "node") {
    const optionsWithValues = new Set([
      "-r", "--require", "--loader", "--import", "--conditions", "--input-type",
      "--inspect-port", "--title", "--stack-trace-limit", "--icu-data-dir", "--openssl-config"
    ]);
    const optionsWithoutValues = new Set([
      "--check", "--experimental-strip-types", "--no-warnings", "--trace-warnings",
      "--use-strict", "--watch", "--test", "--inspect", "--inspect-brk", "--inspect-wait"
    ]);
    for (let index = 0; index < args.length; index += 1) {
      const token = args[index];
      if (["-e", "--eval", "-p", "--print"].includes(token.value)) {
        return { kind: "capture", value: inlineCapture(runtime, executable, args[index + 1], token.value, maxSourceBytes) };
      }
      const evalMatch = token.value.match(/^--(?:eval|print)=(.*)$/su);
      if (evalMatch) return { kind: "capture", value: inlineCapture(runtime, executable, { ...token, value: evalMatch[1] }, "--eval", maxSourceBytes) };
      if (optionsWithValues.has(token.value)) {
        index += 1;
        continue;
      }
      if (optionsWithoutValues.has(token.value) || /^--[^=]+=.+/u.test(token.value)) continue;
      if (token.value === "--") {
        const script = args[index + 1];
        return script ? fileCandidate(runtime, script, cwd, unwrapped, index + 2) : null;
      }
      if (token.value === "-" && heredoc) return { kind: "heredoc", runtime, executable };
      if (token.value.startsWith("-")) return null;
      if (!token.value.startsWith("-")) return fileCandidate(runtime, token, cwd, unwrapped, index + 1);
    }
  } else if (runtime === "ruby") {
    for (let index = 0; index < args.length; index += 1) {
      const token = args[index];
      if (token.value === "-e") return { kind: "capture", value: inlineCapture(runtime, executable, args[index + 1], "-e", maxSourceBytes) };
      if (token.value.startsWith("-e") && token.value.length > 2) {
        return { kind: "capture", value: inlineCapture(runtime, executable, { ...token, value: token.value.slice(2) }, "-e", maxSourceBytes) };
      }
      if (token.value === "-I" || token.value === "-r") {
        index += 1;
        continue;
      }
      if (token.value === "-" && heredoc) return { kind: "heredoc", runtime, executable };
      if (!token.value.startsWith("-")) return fileCandidate(runtime, token, cwd, unwrapped, index + 1);
    }
  } else if (runtime === "shell") {
    for (let index = 0; index < args.length; index += 1) {
      const token = args[index];
      if (token.value === "-c" || /^-[A-Za-z]*c[A-Za-z]*$/u.test(token.value)) {
        return { kind: "capture", value: inlineCapture(runtime, executable, args[index + 1], "-c", maxSourceBytes) };
      }
      if (token.value === "-o" || token.value === "+o") {
        index += 1;
        continue;
      }
      if (token.value === "-" && heredoc) return { kind: "heredoc", runtime, executable };
      if (!token.value.startsWith("-")) return fileCandidate(runtime, token, cwd, unwrapped, index + 1);
    }
  }

  return heredoc ? { kind: "heredoc", runtime, executable } : null;
}

async function staticCd(words, cwd, workspaceRoot) {
  const unwrapped = stripWrappers(words);
  if (unwrapped.length !== 2 || unwrapped[0].value !== "cd" || unwrapped[1].dynamic || unwrapped[1].value === "-") {
    return null;
  }
  const requested = path.isAbsolute(unwrapped[1].value)
    ? unwrapped[1].value
    : path.resolve(cwd, unwrapped[1].value);
  try {
    const canonical = await realpath(requested);
    if ((await stat(canonical)).isDirectory() && isInside(workspaceRoot, canonical)) return canonical;
  } catch {
    // Invalid cd is not a safe basis for resolving a later file.
  }
  return null;
}

async function capturesFromHeader(header, context, heredoc) {
  const segments = splitSegments(tokenizeShell(header));
  const captures = [];
  let cwd = context.cwd;
  let previousWasCd = false;
  let heredocUsed = false;

  for (const segment of segments) {
    const conditionallyExecuted = segment.before === "&&" || segment.before === "||";
    const followsSuccessfulStaticCd = segment.before === "&&" && previousWasCd;
    if (conditionallyExecuted && !followsSuccessfulStaticCd) {
      previousWasCd = false;
      continue;
    }
    const changedDirectory = await staticCd(segment.words, cwd, context.workspaceRoot);
    if (changedDirectory) {
      cwd = changedDirectory;
      previousWasCd = true;
      continue;
    }
    previousWasCd = false;

    const parsed = parseInterpreter(
      segment.words,
      cwd,
      heredoc && !heredocUsed,
      context.maxSourceBytes
    );
    if (!parsed) continue;
    if (parsed.kind === "capture") {
      if (parsed.value) captures.push({ ...parsed.value, executionCwd: cwd });
    } else if (parsed.kind === "file") {
      const captured = await snapshotFile(parsed, context);
      if (captured) captures.push(captured);
    } else if (parsed.kind === "heredoc" && heredoc) {
      if (Buffer.byteLength(heredoc.body, "utf8") > context.maxSourceBytes) {
        heredocUsed = true;
        continue;
      }
      const sanitized = redactText(heredoc.body);
      if (sanitized) {
        captures.push({
          runtime: parsed.runtime,
          command: `${parsed.executable} <heredoc>`,
          executionCwd: cwd,
          source: {
            kind: "heredoc",
            path: null,
            language: languageFor(parsed.runtime),
            redacted: sanitized.redacted,
            code: sanitized.text
          }
        });
      }
      heredocUsed = true;
    }
  }
  return captures;
}

function findHeredocOperator(line) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < line.length - 1; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === "\"") {
      quote = character;
      continue;
    }
    if (character !== "<" || line[index + 1] !== "<" || line[index + 2] === "<") continue;
    let cursor = index + 2;
    let stripTabs = false;
    if (line[cursor] === "-") {
      stripTabs = true;
      cursor += 1;
    }
    while (line[cursor] === " " || line[cursor] === "\t") cursor += 1;
    let delimiterQuote = null;
    if (line[cursor] === "'" || line[cursor] === "\"") {
      delimiterQuote = line[cursor];
      cursor += 1;
    }
    const start = cursor;
    while (cursor < line.length && /[A-Za-z0-9_]/u.test(line[cursor])) cursor += 1;
    if (cursor === start) return null;
    const delimiter = line.slice(start, cursor);
    if (delimiterQuote && line[cursor] !== delimiterQuote) return null;
    return { index, delimiter, quoted: Boolean(delimiterQuote), stripTabs };
  }
  return null;
}

function extractHeredocs(command) {
  const lines = command.split(/\r?\n/u);
  const remaining = [...lines];
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const operator = findHeredocOperator(lines[index]);
    if (!operator) continue;
    let end = index + 1;
    const bodyLines = [];
    while (end < lines.length) {
      const comparable = operator.stripTabs ? lines[end].replace(/^\t+/u, "") : lines[end];
      if (comparable === operator.delimiter) break;
      bodyLines.push(operator.stripTabs ? lines[end].replace(/^\t+/u, "") : lines[end]);
      end += 1;
    }
    if (end >= lines.length) continue;
    const body = `${bodyLines.join("\n")}${bodyLines.length ? "\n" : ""}`;
    if (!operator.quoted && /[$`\\]/u.test(body)) {
      for (let clear = index; clear <= end; clear += 1) remaining[clear] = "";
      index = end;
      continue;
    }
    entries.push({ header: lines[index].slice(0, operator.index), body });
    for (let clear = index; clear <= end; clear += 1) remaining[clear] = "";
    index = end;
  }
  return { entries, remaining: remaining.join("\n") };
}

function clearShellProgram(command) {
  return (
    /^\s*#!/u.test(command) ||
    /\b(?:for|while|until)\b[\s\S]*\bdo\b[\s\S]*\bdone\b/u.test(command) ||
    /\bif\b[\s\S]*\bthen\b[\s\S]*\bfi\b/u.test(command) ||
    /\bcase\b[\s\S]*\besac\b/u.test(command) ||
    /(?:^|\n)\s*(?:function\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\(\)\s*\{/u.test(command)
  );
}

function shellCapture(command, maxSourceBytes) {
  const source = command.trim();
  if (Buffer.byteLength(source, "utf8") > maxSourceBytes) return null;
  const sanitized = redactText(source);
  if (!sanitized || !sanitized.text) return null;
  return {
    runtime: "shell",
    command: "shell <compound>",
    source: {
      kind: "shell",
      path: null,
      language: "shell",
      redacted: sanitized.redacted,
      code: sanitized.text
    }
  };
}

async function ensureRecordsRoot(sourceRoot) {
  let canonicalSource;
  try {
    canonicalSource = await realpath(sourceRoot);
    if (!(await stat(canonicalSource)).isDirectory()) return null;
  } catch {
    return null;
  }

  const recordsRoot = path.join(canonicalSource, "records");
  try {
    const existing = await lstat(recordsRoot);
    if (existing.isSymbolicLink() || !existing.isDirectory()) return null;
  } catch (error) {
    if (error.code !== "ENOENT") return null;
    try {
      await mkdir(recordsRoot, { recursive: false });
    } catch (mkdirError) {
      if (mkdirError.code !== "EEXIST") return null;
    }
  }
  try {
    const canonicalRecords = await realpath(recordsRoot);
    return isInside(canonicalSource, canonicalRecords) ? canonicalRecords : null;
  } catch {
    return null;
  }
}

async function writeRecord(recordsRoot, record, now) {
  const year = String(now.getUTCFullYear()).padStart(4, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  let directory = recordsRoot;
  for (const part of [year, month, day]) {
    directory = path.join(directory, part);
    try {
      const existing = await lstat(directory);
      if (existing.isSymbolicLink() || !existing.isDirectory()) return false;
    } catch (error) {
      if (error.code !== "ENOENT") return false;
      try {
        await mkdir(directory);
      } catch (mkdirError) {
        if (mkdirError.code !== "EEXIST") return false;
      }
      const created = await lstat(directory);
      if (created.isSymbolicLink() || !created.isDirectory()) return false;
    }
    const canonicalPart = await realpath(directory);
    if (!isInside(recordsRoot, canonicalPart)) return false;
    directory = canonicalPart;
  }

  const stamp = now.toISOString().replace(/[-:.]/gu, "");
  const id = randomUUID();
  const finalPath = path.join(directory, `${stamp}-${id}.json`);
  const temporaryPath = path.join(directory, `.${stamp}-${id}.tmp`);
  const content = `${JSON.stringify(record, null, 2)}\n`;
  try {
    await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temporaryPath, finalPath);
    return true;
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

export async function captureHookPayload(input, options = {}) {
  const event = parseHookPayload(input);
  if (!event) return 0;
  const collectionRoot = path.resolve(
    options.llmScriptRoot || process.env.LLM_SCRIPT_ROOT || defaultCollectionRoot()
  );
  const config = await readJsonObject(path.join(collectionRoot, "config.json"));
  const workspaceIndex = await readJsonObject(path.join(collectionRoot, "workspaces.json"));
  if (!config || config.enabled !== true || !workspaceIndex) return 0;

  const workspace = await resolveWorkspace(event.cwd, workspaceIndex);
  if (!workspace) return 0;
  const maxSourceBytes = Number.isSafeInteger(config.maxSourceBytes) && config.maxSourceBytes > 0
    ? Math.min(config.maxSourceBytes, 1024 * 1024)
    : DEFAULT_MAX_SOURCE_BYTES;

  const context = {
    cwd: workspace.cwd,
    workspaceRoot: workspace.root,
    maxSourceBytes
  };
  const extracted = extractHeredocs(event.command);
  const captures = [];
  for (const heredoc of extracted.entries) {
    captures.push(...await capturesFromHeader(heredoc.header, context, heredoc));
  }
  captures.push(...await capturesFromHeader(extracted.remaining, context, null));
  if (!captures.length && clearShellProgram(extracted.remaining)) {
    const captured = shellCapture(extracted.remaining, maxSourceBytes);
    if (captured) captures.push({ ...captured, executionCwd: workspace.cwd });
  }
  if (!captures.length) return 0;
  const recordsRoot = await ensureRecordsRoot(path.join(collectionRoot, "source"));
  if (!recordsRoot) return 0;

  const configuredWorkspaceName = typeof workspace.mapping.project === "string" && workspace.mapping.project.trim()
    ? workspace.mapping.project.trim()
    : typeof workspace.mapping.name === "string" && workspace.mapping.name.trim()
      ? workspace.mapping.name.trim()
      : path.basename(workspace.root);
  const workspaceName = /[\\/\u0000-\u001f\u007f]/u.test(configuredWorkspaceName)
    ? path.basename(workspace.root)
    : configuredWorkspaceName;
  let written = 0;
  for (const capture of captures) {
    const now = options.now instanceof Date ? new Date(options.now) : new Date();
    const record = {
      schemaVersion: 1,
      capturedAt: now.toISOString(),
      workspace: workspaceName,
      cwd: slash(path.relative(workspace.root, capture.executionCwd || workspace.cwd)) || ".",
      command: capture.command,
      runtime: capture.runtime,
      source: capture.source
    };
    try {
      if (await writeRecord(recordsRoot, record, now)) written += 1;
    } catch {
      // Capture is best effort and must not interfere with the shell call.
    }
  }
  return written;
}

export const limits = {
  defaultMaxSourceBytes: DEFAULT_MAX_SOURCE_BYTES,
  maxHookInputBytes: MAX_HOOK_INPUT_BYTES
};
