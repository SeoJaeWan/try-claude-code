#!/usr/bin/env node
/**
 * detect_changes.mjs - SHA256 해시 기반 파일 변경 감지.
 *
 * 현재 실행 루트에서 서비스 루트(app/, apps/, src/, pages/)를 자동 탐색하고,
 * 저장된 해시 데이터베이스와 SHA256 해시를 비교해 변경/추가/삭제된 파일을
 * 식별한다.
 *
 * 출력:
 *   - changes.json      (출력 디렉터리, 기본값: codemaps/)
 *   - .doc-hashes.json  (출력 디렉터리, 실행 간 영속화)
 *
 * 사용법: node detect_changes.mjs [--output-dir <path>]
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const TARGET_DIR_NAMES = new Set(["app", "apps", "src", "pages"]);
// 에이전트가 관리하는 메타데이터 디렉터리와 인프라 경로를 제외한다.
const EXCLUDE_DIRS = new Set([
  ".git",
  ".ai",
  ".claude",
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
const PROJECT_ROOT = process.cwd();

/**
 * CLI 인자 `--output-dir <path>` 를 파싱해 출력 디렉터리 절대 경로를 반환한다.
 * 지정이 없으면 `${PROJECT_ROOT}/codemaps` 를 사용한다.
 *
 * @returns {string} 출력 디렉터리 절대 경로.
 */
function resolveOutputDir() {
  const idx = process.argv.indexOf("--output-dir");
  if (idx !== -1 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1]);
  }
  return path.join(PROJECT_ROOT, "codemaps");
}

const OUTPUT_DIR = resolveOutputDir();
const HASHES_FILE = path.join(OUTPUT_DIR, ".doc-hashes.json");
const CHANGES_FILE = path.join(OUTPUT_DIR, "changes.json");

/**
 * 현재 시각을 `YYYY-MM-DDTHH:MM:SS` 형식 문자열로 반환한다(로컬 시간).
 *
 * @returns {string}
 */
function nowTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

/**
 * 파일의 SHA256 해시(hex)를 계산한다.
 *
 * @param {string} filePath - 해시할 파일 경로.
 * @returns {string} 64자리 hex 해시.
 */
function computeSha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

/**
 * OS 경로 구분자를 POSIX 슬래시로 변환한다.
 *
 * @param {string} inputPath
 * @returns {string}
 */
function normalizePosixPath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

/**
 * 경로 세그먼트 중 하나라도 EXCLUDE_DIRS 에 포함되면 true 를 반환한다.
 *
 * @param {string[]} parts - 경로 세그먼트 배열.
 * @returns {boolean}
 */
function shouldExcludeParts(parts) {
  return parts.some((part) => EXCLUDE_DIRS.has(part));
}

/**
 * 디렉터리 이름과 경로 컨텍스트를 보고 서비스 루트 후보인지 판정한다.
 * - app/apps/src 는 무조건 후보.
 * - pages 는 프로젝트 루트 바로 아래 또는 src/pages/ 형태만 인정한다.
 *
 * @param {string} dirName - 디렉터리 이름.
 * @param {string[]} relParts - PROJECT_ROOT 기준 상대 경로의 세그먼트들.
 * @returns {boolean}
 */
function isCandidateServiceRoot(dirName, relParts) {
  if (dirName === "app" || dirName === "apps" || dirName === "src") {
    return true;
  }

  if (dirName !== "pages") {
    return false;
  }

  // 관례적인 Next.js pages 루트만 인정:
  // - pages/ (프로젝트 루트)
  // - src/pages/
  const parent = relParts.length >= 2 ? relParts[relParts.length - 2] : "";
  return relParts.length === 1 || parent === "src";
}

/**
 * HASHES_FILE 을 읽어 이전 해시 DB 를 반환한다. 없거나 깨지면 빈 객체.
 *
 * @returns {Record<string, string>}
 */
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

/**
 * 해시 DB 를 HASHES_FILE 에 기록한다.
 *
 * @param {Record<string, string>} hashes
 */
function saveHashes(hashes) {
  fs.writeFileSync(HASHES_FILE, JSON.stringify(hashes, null, 2), "utf8");
}

/**
 * 스캔할 서비스 루트가 없거나 에러로 중단된 경우의 fallback changes.json 을
 * 기록한다. 다운스트림 스킬이 빈 결과로도 정상 동작하도록 한다.
 *
 * @param {{reason?: string, scanRoots?: string[]}} [options]
 */
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

/**
 * 디렉터리를 재귀 순회하며 서비스 루트 후보 디렉터리 절대 경로를 누적한다.
 * 제외 디렉터리는 들어가지 않는다.
 *
 * @param {string} dirPath - 탐색 시작 경로.
 * @param {string[]} [out] - 누적 배열.
 * @returns {string[]}
 */
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

/**
 * 후보 서비스 루트를 모두 발견한 뒤 중첩 관계인 항목을 제거(부모만 남김)
 * 하고 정렬해 반환한다.
 *
 * @returns {string[]} 스캔에 사용할 서비스 루트 절대 경로 배열.
 */
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

/**
 * 디렉터리를 재귀 순회하며 모든 일반 파일 경로를 수집한다. 제외 디렉터리
 * 안으로는 들어가지 않는다.
 *
 * @param {string} dirPath
 * @param {string[]} [out]
 * @returns {string[]}
 */
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

/**
 * 주어진 스캔 디렉터리들 아래의 모든 파일에 대해 SHA256 해시를 계산한다.
 * 읽기 실패 파일은 조용히 건너뛴다. 키는 PROJECT_ROOT 기준 POSIX 상대 경로.
 *
 * @param {string[]} scanDirectories
 * @param {string} projectRoot
 * @returns {Record<string, string>} 경로 → 해시 맵.
 */
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
        // 읽을 수 없는 파일은 무시한다.
      }
    }
  }
  return currentFiles;
}

/**
 * 저장된 해시와 현재 해시를 비교해 변경/추가/삭제 목록과 unchanged 개수를
 * 반환한다.
 *
 * @param {Record<string, string>} storedHashes
 * @param {Record<string, string>} currentHashes
 * @returns {[string[], string[], string[], number]} [changed, added, deleted, unchangedCount]
 */
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

/**
 * 출력 디렉터리가 없으면 재귀 생성한다.
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * 진입점. 서비스 루트를 발견하고 해시를 비교한 뒤 changes.json 과
 * .doc-hashes.json 을 갱신한다.
 */
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
    // silent fallback 유지.
  }
  process.exit(0);
}
