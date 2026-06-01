import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"]);
export const CONFIG_EXTENSIONS = new Set([".json", ".jsonc", ".yml", ".yaml", ".toml", ".ini", ".conf", ".config", ".properties"]);
export const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx", ".markdown"]);
export const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass", ".less", ".pcss"]);
export const MARKUP_EXTENSIONS = new Set([".html", ".htm", ".xml", ".svg"]);
export const TEXT_EXTENSIONS = new Set([".txt", ".text", ".csv", ".tsv", ".sql", ".graphql", ".gql", ".prisma"]);
export const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".avif",
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".tar",
  ".mp3",
  ".mp4",
  ".mov",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot"
]);

const ALLOWED_DOT_DIRS = new Set([".codex", ".github", ".claude-plugin", ".agents"]);
const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".parcel-cache",
  "out"
]);
const EXCLUDED_REL_PREFIXES = [".codex/dev-wiki/source", ".codex/plan-wiki/source"];
const GENERATED_MARKERS = ["/assets/vendor/", ".min.js", ".bundle.js", ".generated.", "/generated/"];
const MAX_FILE_BYTES = 900_000;
const LOCKFILE_BASENAMES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "Cargo.lock", "poetry.lock"]);
const CONFIG_BASENAMES = new Set([
  ".gitignore",
  ".npmrc",
  ".nvmrc",
  ".node-version",
  ".editorconfig",
  "Dockerfile",
  "Makefile",
  "tsconfig.json",
  "jsconfig.json"
]);

export function slash(value) {
  return value.split(path.sep).join("/");
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function walk(root, rel = "", output = []) {
  const dir = path.join(root, rel);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && !ALLOWED_DOT_DIRS.has(entry.name)) continue;
    const childRel = slash(path.join(rel, entry.name));
    if (shouldExcludeRel(childRel)) continue;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(root, childRel, output);
    } else if (entry.isFile()) {
      output.push(childRel);
    }
  }
  return output;
}

function gitFiles(root) {
  const output = runGit(["ls-files", "-co", "--exclude-standard"], root);
  if (!output) return null;
  return output.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).map((item) => item.replace(/\\/g, "/"));
}

export function shouldExcludeRel(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (EXCLUDED_REL_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) return true;
  const parts = normalized.split("/");
  if (parts.some((part) => EXCLUDED_DIRS.has(part))) return true;
  if (isSecretLike(normalized)) return true;
  return false;
}

export function isGeneratedOrVendor(relPath) {
  const normalized = `/${relPath.replace(/\\/g, "/")}`;
  return GENERATED_MARKERS.some((marker) => normalized.includes(marker));
}

export function isSecretLike(relPath) {
  const base = path.basename(relPath);
  if (/^\.env(?:\.|$)/.test(base)) return true;
  if (/\.(pem|key|p12|pfx|crt|cer)$/i.test(base)) return true;
  if (/(^|[-_.])(secret|secrets|credential|credentials)([-_.]|$)/i.test(base)) return true;
  return false;
}

function isLikelyTextFile(absPath) {
  try {
    const sample = readFileSync(absPath).subarray(0, 4096);
    return !sample.includes(0);
  } catch {
    return false;
  }
}

export function fileKind(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  const base = path.basename(relPath);
  const ext = path.extname(base);
  if (base === "SKILL.md") return "skill";
  if (/\/agents\/[^/]+\.md$/.test(normalized)) return "agent";
  if (base === "hooks.json") return "hook_config";
  if (base === "plugin.json") return "plugin_manifest";
  if (base === "package.json") return "package_manifest";
  if (/^\.github\/workflows\/.+\.ya?ml$/.test(normalized)) return "ci_workflow";
  if (/^\.codex\/(dev-wiki|plan-wiki)\/config\.json$/.test(normalized)) return "wiki_config";
  if (/^(\.claude-plugin|\.agents\/plugins)\/marketplace\.json$/.test(normalized)) return "marketplace_config";
  if (LOCKFILE_BASENAMES.has(base)) return "lockfile";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (MARKDOWN_EXTENSIONS.has(ext)) return "markdown";
  if (STYLE_EXTENSIONS.has(ext)) return "stylesheet";
  if (MARKUP_EXTENSIONS.has(ext)) return "markup";
  if (CONFIG_EXTENSIONS.has(ext) || CONFIG_BASENAMES.has(base)) return "config";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return null;
}

export function scanWorkspace(workspaceRoot, { maxFiles = 2000 } = {}) {
  const source = gitFiles(workspaceRoot) || walk(workspaceRoot);
  const files = [];
  const excluded = [];

  for (const relPath of source.sort()) {
    if (shouldExcludeRel(relPath)) {
      excluded.push({ path: relPath, reason: isSecretLike(relPath) ? "secret-like" : "excluded-path" });
      continue;
    }

    const abs = path.join(workspaceRoot, relPath);
    if (!existsSync(abs)) continue;
    const stats = statSync(abs);
    if (stats.size > MAX_FILE_BYTES) {
      excluded.push({ path: relPath, reason: "large-file", bytes: stats.size });
      continue;
    }

    const ext = path.extname(relPath);
    if (BINARY_EXTENSIONS.has(ext)) {
      excluded.push({ path: relPath, reason: "binary-or-media", bytes: stats.size });
      continue;
    }
    if (isGeneratedOrVendor(relPath)) {
      excluded.push({ path: relPath, reason: "generated-or-vendor", bytes: stats.size });
      continue;
    }

    let kind = fileKind(relPath);
    if (!kind && isLikelyTextFile(abs)) kind = "text";
    if (!kind) {
      excluded.push({ path: relPath, reason: "unknown-binary-or-unsupported", bytes: stats.size });
      continue;
    }

    files.push({
      path: relPath,
      kind,
      bytes: stats.size,
      mtime_ms: stats.mtimeMs
    });
    if (files.length >= maxFiles) break;
  }

  return { files, excluded };
}
