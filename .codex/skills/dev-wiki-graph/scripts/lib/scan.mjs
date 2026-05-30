import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
export const CONFIG_EXTENSIONS = new Set([".json", ".yml", ".yaml"]);

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
  return false;
}

export function isGeneratedOrVendor(relPath) {
  const normalized = `/${relPath.replace(/\\/g, "/")}`;
  return GENERATED_MARKERS.some((marker) => normalized.includes(marker));
}

export function fileKind(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  const base = path.basename(relPath);
  const ext = path.extname(base);
  if (base === "package-lock.json") return null;
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (base === "SKILL.md") return "skill";
  if (/\/agents\/[^/]+\.md$/.test(normalized)) return "agent";
  if (base === "hooks.json") return "hook_config";
  if (base === "plugin.json") return "plugin_manifest";
  if (base === "package.json") return "package_manifest";
  if (/^\.github\/workflows\/.+\.ya?ml$/.test(normalized)) return "ci_workflow";
  if (/^\.codex\/(dev-wiki|plan-wiki)\/config\.json$/.test(normalized)) return "wiki_config";
  if (/^(\.claude-plugin|\.agents\/plugins)\/marketplace\.json$/.test(normalized)) return "marketplace_config";
  if (CONFIG_EXTENSIONS.has(ext)) return null;
  return null;
}

export function scanWorkspace(workspaceRoot, { maxFiles = 2000 } = {}) {
  const source = gitFiles(workspaceRoot) || walk(workspaceRoot);
  const files = [];
  const excluded = [];

  for (const relPath of source.sort()) {
    if (shouldExcludeRel(relPath)) continue;
    const kind = fileKind(relPath);
    if (!kind) continue;

    const abs = path.join(workspaceRoot, relPath);
    if (!existsSync(abs)) continue;
    const stats = statSync(abs);
    if (stats.size > MAX_FILE_BYTES) {
      excluded.push({ path: relPath, reason: "large-file", bytes: stats.size });
      continue;
    }
    if (kind === "code" && isGeneratedOrVendor(relPath)) {
      excluded.push({ path: relPath, reason: "generated-or-vendor", bytes: stats.size });
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
