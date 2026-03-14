#!/usr/bin/env node
/**
 * detect_changes.mjs - SHA256 hash-based file change detection.
 *
 * Discovers service roots (app/, apps/, src/, pages/) from the current execution
 * root and detects changed, added, and deleted files by comparing SHA256 hashes
 * against a stored hash database.
 *
 * Outputs:
 *   - changes.json      (output directory, default: codemaps/)
 *   - .doc-hashes.json  (output directory, persisted between runs)
 *
 * Usage: node detect_changes.mjs [--output-dir <path>]
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const TARGET_DIR_NAMES = new Set(["app", "apps", "src", "pages"]);
// Excluded directories include agent-managed metadata directories and
// infrastructure paths.
const EXCLUDE_DIRS = new Set([
  ".git",
  ".ai",
  ".claude",
  "try-claude",
  ".codex",
  ".github",
  ".idea",
  ".next",
  ".turbo",
  ".vscode",
  "__pycache__",
  "__tests__",
  "benchmark",
  "build",
  "coverage",
  "dist",
  "docs",
  "examples",
  "fixtures",
  "node_modules",
  "out",
  "research",
  "seminar",
  "spec",
  "specs",
  "target",
  "temp",
  "templates",
  "test",
  "tests",
  "tmp",
  "vendor",
]);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");

function resolveOutputDir() {
  const idx = process.argv.indexOf("--output-dir");
  if (idx !== -1 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1]);
  }
  return path.join(PROJECT_ROOT, ".claude", "try-claude", "codemaps");
}

const OUTPUT_DIR = resolveOutputDir();
const HASHES_FILE = path.join(OUTPUT_DIR, ".doc-hashes.json");
const CHANGES_FILE = path.join(OUTPUT_DIR, "changes.json");

function nowTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function computeSha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function normalizePosixPath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

function shouldExcludeParts(parts) {
  return parts.some((part) => EXCLUDE_DIRS.has(part));
}

function isCandidateServiceRoot(dirName, relParts) {
  if (dirName === "app" || dirName === "apps" || dirName === "src") {
    return true;
  }

  if (dirName !== "pages") {
    return false;
  }

  // Accept only conventional Next.js pages roots:
  // - pages/ at project root
  // - src/pages/
  const parent = relParts.length >= 2 ? relParts[relParts.length - 2] : "";
  return relParts.length === 1 || parent === "src";
}

function loadHashes() {
  if (!fs.existsSync(HASHES_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(HASHES_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveHashes(hashes) {
  fs.writeFileSync(HASHES_FILE, JSON.stringify(hashes, null, 2), "utf8");
}

function writeEmptyChanges(options = {}) {
  const { reason = "no_service_dirs_found", scanRoots = [] } = options;
  const empty = {
    changed: [],
    added: [],
    deleted: [],
    scan_roots: scanRoots,
    discovery_mode: "auto-root-scan",
    reason,
    unchanged_count: 0,
    last_scan: nowTimestamp(),
  };
  fs.writeFileSync(CHANGES_FILE, JSON.stringify(empty, null, 2), "utf8");
}

function walkDirectoriesForRoots(dirPath, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const abs = path.join(dirPath, entry.name);
    const rel = path.relative(PROJECT_ROOT, abs);
    if (!rel || rel.startsWith("..")) {
      continue;
    }

    const relParts = rel.split(path.sep);
    if (shouldExcludeParts(relParts)) {
      continue;
    }

    if (TARGET_DIR_NAMES.has(entry.name) && isCandidateServiceRoot(entry.name, relParts)) {
      out.push(abs);
    }

    walkDirectoriesForRoots(abs, out);
  }

  return out;
}

function discoverScanDirectories() {
  const discovered = walkDirectoriesForRoots(PROJECT_ROOT, []);
  const uniq = new Map();
  for (const dirPath of discovered) {
    uniq.set(path.resolve(dirPath), true);
  }

  const sortedByDepth = [...uniq.keys()].sort((a, b) => a.length - b.length);
  const pruned = [];

  for (const dirPath of sortedByDepth) {
    const isNested = pruned.some((rootDir) => {
      if (dirPath === rootDir) {
        return true;
      }
      return dirPath.startsWith(rootDir + path.sep);
    });
    if (!isNested) {
      pruned.push(dirPath);
    }
  }

  return pruned.sort();
}

function walkFiles(dirPath, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const rel = path.relative(PROJECT_ROOT, abs);
      const relParts = rel ? rel.split(path.sep) : [];
      if (shouldExcludeParts(relParts)) {
        continue;
      }
      walkFiles(abs, out);
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function scanRootDirectories(scanDirectories, projectRoot) {
  const currentFiles = {};
  for (const scanDir of scanDirectories) {
    const files = walkFiles(scanDir);
    for (const filePath of files) {
      const rel = path.relative(projectRoot, filePath);
      if (!rel || rel.startsWith("..")) {
        continue;
      }
      const relParts = rel.split(path.sep);
      if (shouldExcludeParts(relParts)) {
        continue;
      }
      const relPosix = normalizePosixPath(relParts.join(path.sep));
      try {
        currentFiles[relPosix] = computeSha256(filePath);
      } catch {
        // Skip unreadable files.
      }
    }
  }
  return currentFiles;
}

function detectChanges(storedHashes, currentHashes) {
  const changed = [];
  const added = [];
  let unchangedCount = 0;

  for (const [filePath, sha] of Object.entries(currentHashes)) {
    if (!(filePath in storedHashes)) {
      added.push(filePath);
    } else if (storedHashes[filePath] !== sha) {
      changed.push(filePath);
    } else {
      unchangedCount += 1;
    }
  }

  const deleted = Object.keys(storedHashes).filter((p) => !(p in currentHashes));
  return [changed, added, deleted, unchangedCount];
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function main() {
  ensureOutputDir();
  const existingScanDirs = discoverScanDirectories();
  const scanRoots = existingScanDirs.map((dirPath) =>
    normalizePosixPath(path.relative(PROJECT_ROOT, dirPath))
  );

  if (existingScanDirs.length === 0) {
    saveHashes({});
    writeEmptyChanges({ reason: "no_service_dirs_found", scanRoots: [] });
    return;
  }

  const storedHashes = loadHashes();
  const currentHashes = scanRootDirectories(existingScanDirs, PROJECT_ROOT);
  const [changed, added, deleted, unchangedCount] = detectChanges(storedHashes, currentHashes);

  const result = {
    changed: [...changed].sort(),
    added: [...added].sort(),
    deleted: [...deleted].sort(),
    scan_roots: scanRoots,
    discovery_mode: "auto-root-scan",
    reason: "ok",
    unchanged_count: unchangedCount,
    last_scan: nowTimestamp(),
  };

  fs.writeFileSync(CHANGES_FILE, JSON.stringify(result, null, 2), "utf8");

  const updatedHashes = {};
  for (const [k, v] of Object.entries(storedHashes)) {
    if (!deleted.includes(k)) {
      updatedHashes[k] = v;
    }
  }
  Object.assign(updatedHashes, currentHashes);
  saveHashes(updatedHashes);
}

try {
  main();
} catch {
  try {
    writeEmptyChanges({ reason: "scan_error", scanRoots: [] });
  } catch {
    // keep silent fallback behavior.
  }
  process.exit(0);
}

