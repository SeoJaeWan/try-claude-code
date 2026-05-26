#!/usr/bin/env node
/**
 * extract_structure.mjs - Next.js 라우트와 Prisma 스키마 사전 추출.
 *
 * changes.json(출력 디렉터리, 기본값: codemaps/)을 읽어 변경/추가된 각 파일에
 * 대해 다음을 수행한다:
 *   - Next.js page/layout/route 파일 감지 + 경로에서 라우트 추출
 *   - Prisma 스키마 파일 감지 + 모델명/필드 파싱
 *
 * 출력: 출력 디렉터리의 extracted_structure.json.
 *
 * 사용법: node extract_structure.mjs [--output-dir <path>]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();

/**
 * CLI 인자 `--output-dir <path>` 를 파싱해 출력 디렉터리 절대 경로를 반환한다.
 * 지정이 없으면 `${PROJECT_ROOT}/codemaps` 를 사용한다.
 *
 * @returns {string}
 */
function resolveOutputDir() {
  const idx = process.argv.indexOf("--output-dir");
  if (idx !== -1 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1]);
  }
  return path.join(PROJECT_ROOT, "codemaps");
}

const OUTPUT_DIR = resolveOutputDir();
const CHANGES_FILE = path.join(OUTPUT_DIR, "changes.json");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "extracted_structure.json");
const NEXTJS_ROUTE_FILES = new Set([
  "page.tsx",
  "page.ts",
  "page.jsx",
  "page.js",
  "layout.tsx",
  "layout.ts",
  "layout.jsx",
  "layout.js",
  "route.ts",
  "route.js",
]);

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
 * 입력이 없거나 에러로 중단된 경우의 fallback extracted_structure.json 을 기록한다.
 */
function writeEmptyStructure() {
  const empty = {
    nextjs_routes: [],
    prisma_models: [],
    fallback_files: [],
    last_scan: nowTimestamp(),
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(empty, null, 2), "utf8");
}

/**
 * detect_changes 가 생성한 changes.json 을 읽는다. 없거나 깨졌으면 null.
 *
 * @returns {object|null}
 */
function loadChanges() {
  if (!fs.existsSync(CHANGES_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(CHANGES_FILE, "utf8"));
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/**
 * 파일 경로가 Next.js 라우트 파일인지(`app/` 또는 `pages/` 하위의
 * page/layout/route 파일) 판정한다.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function isNextjsFile(filePath) {
  const posixPath = filePath.split(path.sep).join("/");
  const parts = posixPath.split("/");
  const filename = parts[parts.length - 1];
  if (!NEXTJS_ROUTE_FILES.has(filename)) {
    return false;
  }
  return parts.includes("app") || parts.includes("pages");
}

/**
 * 파일이 Prisma 스키마(`schema.prisma`)인지 판정한다.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function isPrismaSchema(filePath) {
  const filename = filePath.split(path.sep).join("/").split("/").pop() || "";
  return filename === "schema.prisma";
}

/**
 * Next.js 파일 경로에서 라우트 문자열·타입(page/layout/route)을 추출한다.
 * app/ 하위에서는 group(()로 감싸진 세그먼트)을 제거한다.
 * pages/ 하위에서는 파일명 stem 을 라우트의 마지막 세그먼트로 사용하며,
 * index 면 라우트에 포함하지 않는다.
 *
 * @param {string} filePath
 * @returns {{route: string, file: string, type: string}|null}
 */
function extractNextjsRoute(filePath) {
  const posixPath = filePath.split(path.sep).join("/");
  const parts = posixPath.split("/");
  const filename = parts[parts.length - 1];

  let routeType = "page";
  if (filename.startsWith("route")) {
    routeType = "route";
  } else if (filename.startsWith("layout")) {
    routeType = "layout";
  }

  let anchorIndex = -1;
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] === "app" || parts[i] === "pages") {
      anchorIndex = i;
      break;
    }
  }
  if (anchorIndex < 0) {
    return null;
  }

  let route = "/";
  if (parts[anchorIndex] === "app") {
    let routeParts = parts.slice(anchorIndex + 1, -1);
    routeParts = routeParts.filter((seg) => !/^\(.*\)$/.test(seg));
    route = routeParts.length > 0 ? `/${routeParts.join("/")}` : "/";
  } else {
    const routeParts = parts.slice(anchorIndex + 1, -1);
    const stem = filename.includes(".") ? filename.slice(0, filename.lastIndexOf(".")) : filename;
    const routePartsWithStem = stem === "index" ? routeParts : [...routeParts, stem];
    route = routePartsWithStem.length > 0 ? `/${routePartsWithStem.join("/")}` : "/";
  }

  return { route, file: posixPath, type: routeType };
}

/**
 * Prisma 스키마 문자열에서 model 정의들을 파싱해 각 모델의 필드 이름 배열과
 * 함께 반환한다. 주석/`@@` 블록/`@` 디렉티브는 필드로 취급하지 않는다.
 *
 * @param {string} content - schema.prisma 파일 내용.
 * @param {string} filePath - 원본 경로(결과의 file 필드에 보존).
 * @returns {Array<{model: string, fields: string[], file: string}>}
 */
function parsePrismaSchema(content, filePath) {
  const models = [];
  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const modelMatch = line.match(/^\s*model\s+(\w+)\s*\{/);
    if (!modelMatch) {
      i += 1;
      continue;
    }

    const modelName = modelMatch[1];
    const fields = [];
    i += 1;
    let braceDepth = 1;

    while (i < lines.length && braceDepth > 0) {
      const fieldLine = lines[i];
      braceDepth += (fieldLine.match(/\{/g) || []).length;
      braceDepth -= (fieldLine.match(/\}/g) || []).length;

      if (braceDepth > 0) {
        const stripped = fieldLine.trim();
        if (
          stripped &&
          !stripped.startsWith("//") &&
          !stripped.startsWith("@@") &&
          !stripped.startsWith("@") &&
          !stripped.startsWith("}")
        ) {
          const tokens = stripped.split(/\s+/);
          if (tokens.length > 0 && /^\w+$/.test(tokens[0])) {
            fields.push(tokens[0]);
          }
        }
      }
      i += 1;
    }

    models.push({ model: modelName, fields, file: filePath.split(path.sep).join("/") });
  }

  return models;
}

/**
 * 단일 파일을 처리한다. Next.js/Prisma 어느 카테고리에도 속하지 않으면
 * 세 값 모두 null 을 반환한다. 처리 도중 예외가 발생하면 fallback 으로
 * 분류한다.
 *
 * @param {string} filePath - PROJECT_ROOT 기준 상대 경로.
 * @param {string} projectRoot
 * @returns {[object|null, Array<object>|null, string|null]} [nextjsEntry, prismaEntries, fallback]
 */
function processFile(filePath, projectRoot) {
  if (isNextjsFile(filePath)) {
    try {
      return [extractNextjsRoute(filePath), null, null];
    } catch {
      return [null, null, filePath];
    }
  }

  if (isPrismaSchema(filePath)) {
    const absPath = path.join(projectRoot, filePath);
    try {
      const content = fs.readFileSync(absPath, "utf8");
      const models = parsePrismaSchema(content, filePath);
      return [null, models, null];
    } catch {
      return [null, null, filePath];
    }
  }

  return [null, null, null];
}

/**
 * 진입점. changes.json 을 읽어 변경/추가 파일을 처리한 뒤
 * extracted_structure.json 을 기록한다.
 */
function main() {
  const changes = loadChanges();
  if (!changes) {
    writeEmptyStructure();
    return;
  }

  const filesToProcess = [];
  for (const key of ["changed", "added"]) {
    const value = changes[key];
    if (Array.isArray(value)) {
      filesToProcess.push(...value);
    }
  }

  const projectRoot = PROJECT_ROOT;
  const nextjsRoutes = [];
  const prismaModels = [];
  const fallbackFiles = [];

  for (const filePath of filesToProcess) {
    try {
      const [nextjsEntry, prismaEntries, fallback] = processFile(filePath, projectRoot);
      if (nextjsEntry) {
        nextjsRoutes.push(nextjsEntry);
      }
      if (prismaEntries) {
        prismaModels.push(...prismaEntries);
      }
      if (fallback) {
        fallbackFiles.push(fallback);
      }
    } catch {
      fallbackFiles.push(filePath);
    }
  }

  const result = {
    nextjs_routes: nextjsRoutes,
    prisma_models: prismaModels,
    fallback_files: fallbackFiles,
    last_scan: nowTimestamp(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf8");
}

try {
  main();
} catch {
  try {
    writeEmptyStructure();
  } catch {
    // silent fallback 유지.
  }
  process.exit(0);
}
