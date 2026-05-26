#!/usr/bin/env node

/**
 * plan wiki source repository를 사람이 읽는 로컬 문서 사이트로 보여주는 HTTP 서버.
 *
 * `wiki/core`, `wiki/patterns`, `wiki/tags`, `raw`, `history`, `feedback`을 읽어
 * 문서 페이지, 검색 API, 선택 영역 feedback inbox 저장 API를 제공한다.
 */

import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const argv = process.argv.slice(2);

/**
 * CLI 인자 목록에서 값이 필요한 flag의 값을 읽는다.
 *
 * @param {string} name 찾을 flag 이름.
 * @returns {string | null} flag 다음 값이 있으면 그 값, 없으면 `null`.
 */
function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

if (argv.includes("--help") || argv.includes("-h")) {
  console.log("Usage: node .codex/tools/plan-wiki-docs-server.mjs [--port 9788] [--source-root PATH]");
  console.log("");
  console.log("Default source root: ./.codex/plan-wiki/source");
  console.log("--wiki-root is kept as a compatibility alias for --source-root.");
  console.log("Open docs at: http://localhost:9788");
  process.exit(0);
}

const defaultWikiRoot = path.join(repoRoot, ".codex", "plan-wiki", "source");
const wikiRoot = path.resolve(
  takeFlag("--source-root") ||
    takeFlag("--wiki-root") ||
    process.env.PLAN_WIKI_SOURCE_ROOT ||
    process.env.PLAN_WIKI_ROOT ||
    defaultWikiRoot
);
const requestedPort = Number(takeFlag("--port") || process.env.PLAN_WIKI_DOCS_PORT || 9788);
const port = Number.isFinite(requestedPort) ? requestedPort : 9788;

/**
 * 문서 사이트에서 수집하고 라우팅할 plan wiki 문서 root 목록.
 *
 * @type {{ kind: string, label: string, root: string, routePrefix: string, nested?: boolean }[]}
 */
const documentRoots = [
  { kind: "core", label: "핵심 정책", root: "wiki/core", routePrefix: "/core" },
  { kind: "pattern", label: "패턴", root: "wiki/patterns", routePrefix: "/patterns" },
  { kind: "raw", label: "원문 리뷰", root: "raw", routePrefix: "/raw" },
  { kind: "tag", label: "태그", root: "wiki/tags", routePrefix: "/tags", nested: true },
  { kind: "meta", label: "메타", root: "wiki/_meta", routePrefix: "/meta" }
];

/**
 * feedback maintenance workflow에서 사용하는 feedback 상태 디렉터리 목록.
 *
 * @type {string[]}
 */
const feedbackStatuses = ["inbox", "applied", "needs-decision", "stale", "rejected"];

/**
 * JSON 응답을 UTF-8 본문으로 보낸다.
 *
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {number} status HTTP status code.
 * @param {unknown} value JSON으로 직렬화할 값.
 * @returns {void}
 */
function sendJson(res, status, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

/**
 * HTML 응답을 UTF-8 본문으로 보낸다.
 *
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {number} status HTTP status code.
 * @param {string} value HTML 본문.
 * @returns {void}
 */
function sendHtml(res, status, value) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(value);
}

/**
 * plain text 응답을 UTF-8 본문으로 보낸다.
 *
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {number} status HTTP status code.
 * @param {string} value 응답 본문.
 * @returns {void}
 */
function sendText(res, status, value) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(value);
}

/**
 * 파일 확장자에 맞는 HTTP content-type을 반환한다.
 *
 * @param {string} filePath 파일 경로.
 * @returns {string} content-type 헤더 값.
 */
function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  }[ext] || "application/octet-stream";
}

/**
 * 정적 파일을 stream으로 응답한다.
 *
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} filePath 전송할 파일 경로.
 * @returns {Promise<void>}
 */
async function sendFile(res, filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return sendText(res, 404, "Not found");
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    return createReadStream(filePath).pipe(res);
  } catch {
    return sendText(res, 404, "Not found");
  }
}

/**
 * HTTP 요청 본문을 문자열로 읽고 크기를 제한한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @returns {Promise<string>} UTF-8 요청 본문.
 * @throws {Error} 본문이 128KiB를 넘는 경우.
 */
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 128 * 1024) {
      throw new Error("request body too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * 경로 존재 여부를 비동기로 확인한다.
 *
 * @param {string} filePath 확인할 파일 또는 디렉터리 경로.
 * @returns {Promise<boolean>} 존재하면 `true`.
 */
async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * JSON 파일을 읽고 실패하면 fallback을 반환한다.
 *
 * @template T
 * @param {string} filePath 읽을 JSON 파일 경로.
 * @param {T} [fallback=null] 실패 시 반환할 값.
 * @returns {Promise<T | unknown>} 파싱된 JSON 값 또는 fallback.
 */
async function readJson(filePath, fallback = null) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

/**
 * JSON 파일을 임시 파일에 먼저 쓴 뒤 rename으로 원자적으로 교체한다.
 *
 * @param {string} filePath 저장할 JSON 파일 경로.
 * @param {unknown} value 직렬화할 값.
 * @returns {Promise<void>}
 */
async function writeJsonAtomic(filePath, value) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
}

/**
 * rootDir 아래 모든 파일을 재귀적으로 나열한다.
 *
 * 없는 root는 빈 목록으로 취급한다.
 *
 * @param {string} rootDir 검색할 디렉터리.
 * @returns {Promise<string[]>} 정렬된 파일 절대 경로 목록.
 */
async function listFiles(rootDir) {
  const files = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  await walk(rootDir);
  return files.sort((a, b) => a.localeCompare(b));
}

/**
 * 운영체제별 path separator를 POSIX slash로 바꾼다.
 *
 * @param {string} value 변환할 경로 문자열.
 * @returns {string} slash 기반 경로.
 */
function toPosix(value) {
  return value.split(path.sep).join("/");
}

/**
 * plan wiki source root 기준 상대 source path를 만든다.
 *
 * @param {string} filePath 절대 파일 경로.
 * @returns {string} wiki root 기준 POSIX 상대 경로.
 */
function sourcePathFor(filePath) {
  return toPosix(path.relative(wikiRoot, filePath));
}

/**
 * HTML text node에 안전하게 넣을 수 있도록 문자열을 escape한다.
 *
 * @param {unknown} value escape할 값.
 * @returns {string} HTML escape된 문자열.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML attribute 값에 안전하게 넣을 수 있도록 문자열을 escape한다.
 *
 * @param {unknown} value escape할 값.
 * @returns {string} attribute-safe 문자열.
 */
function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

/**
 * Markdown 문법을 제거하고 검색/요약에 쓸 plain text를 만든다.
 *
 * @param {string} markdown Markdown 원문.
 * @returns {string} 공백이 정규화된 plain text.
 */
function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`|[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 제한된 YAML frontmatter scalar 값을 파싱한다.
 *
 * @param {string} value frontmatter 값 문자열.
 * @returns {string | string[]} scalar 또는 inline 배열 값.
 */
function parseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed;
}

/**
 * Markdown 문서의 YAML frontmatter와 본문을 분리한다.
 *
 * @param {string} markdown Markdown 원문.
 * @returns {{ data: Record<string, unknown>, content: string }} frontmatter 객체와 본문.
 */
function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n") && !markdown.startsWith("---\r\n")) {
    return { data: {}, content: markdown };
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) {
    return { data: {}, content: markdown };
  }

  const data = {};
  const lines = normalized.slice(4, end).split("\n");
  let activeKey = null;

  for (const line of lines) {
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && activeKey) {
      if (!Array.isArray(data[activeKey])) data[activeKey] = [];
      data[activeKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;
    activeKey = keyMatch[1];
    data[activeKey] = keyMatch[2] ? parseScalar(keyMatch[2]) : [];
  }

  return { data, content: normalized.slice(end + 5) };
}

/**
 * Markdown 본문에서 첫 번째 H1 제목을 추출한다.
 *
 * @param {string} markdown Markdown 본문.
 * @returns {string | null} 첫 H1 제목 또는 없으면 `null`.
 */
function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Markdown 본문에서 제목을 제외한 첫 문단 요약을 추출한다.
 *
 * @param {string} markdown Markdown 본문.
 * @returns {string} plain text 첫 문단.
 */
function firstParagraph(markdown) {
  const body = markdown
    .replace(/^#.*$/gm, "")
    .split(/\n\s*\n/)
    .map((part) => stripMarkdown(part))
    .find(Boolean);
  return body || "";
}

/**
 * 긴 요약 문장을 지정 길이로 줄인다.
 *
 * @param {unknown} value 요약 후보 값.
 * @param {number} [max=180] 최대 길이.
 * @returns {string} 줄인 요약.
 */
function trimSummary(value, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

/**
 * 문자열을 RegExp literal로 안전하게 사용할 수 있게 escape한다.
 *
 * @param {unknown} value escape할 값.
 * @returns {string} RegExp escape된 문자열.
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 문서 본문 비교를 위해 Markdown을 plain text로 정규화한다.
 *
 * @param {string} value 비교할 Markdown 또는 text.
 * @returns {string} 공백 정규화된 비교 문자열.
 */
function comparableText(value) {
  return stripMarkdown(value).replace(/\s+/g, " ").trim();
}

/**
 * 렌더링용 문서 본문에서 중복 H1과 frontmatter summary와 같은 개요 문단을 제거한다.
 *
 * @param {{ title: string, summary?: string, content: string }} doc 렌더링 대상 문서.
 * @returns {string} 문서 화면에 표시할 Markdown 본문.
 */
function documentBodyMarkdown(doc) {
  let markdown = doc.content.replace(/\r\n/g, "\n").replace(/^\s+/, "");
  const titlePattern = new RegExp(`^#\\s+${escapeRegExp(doc.title)}\\s*\\n+`);
  markdown = markdown.replace(titlePattern, "");

  const lines = markdown.split("\n");
  if (/^##\s+\uac1c\uc694\s*$/.test(lines[0] || "")) {
    const nextHeading = lines.findIndex((line, index) => index > 0 && /^#{1,6}\s+/.test(line));
    const sectionEnd = nextHeading === -1 ? lines.length : nextHeading;
    const overviewBody = lines.slice(1, sectionEnd).join("\n");
    if (doc.summary && comparableText(overviewBody) === comparableText(doc.summary)) {
      markdown = lines.slice(sectionEnd).join("\n").replace(/^\s+/, "");
    }
  }

  return markdown;
}

/**
 * 파일명에서 확장자를 제외한 slug를 추출한다.
 *
 * @param {string} filePath 파일 경로.
 * @returns {string} basename slug.
 */
function slugFromPath(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * source path와 문서 root 설정으로 사이트 route를 만든다.
 *
 * @param {{ root: string, routePrefix: string }} rootConfig 문서 root 설정.
 * @param {string} sourcePath wiki root 기준 source path.
 * @returns {string} 사이트 route.
 */
function routeFor(rootConfig, sourcePath) {
  const root = rootConfig.root.replace(/\\/g, "/");
  const withoutRoot = sourcePath.slice(root.length).replace(/^\/+/, "").replace(/\.md$/i, "");
  if (!withoutRoot || withoutRoot === "index") return rootConfig.routePrefix;
  return `${rootConfig.routePrefix}/${withoutRoot}`;
}

/**
 * 문서 목록 정렬 순서를 계산한다.
 *
 * @param {{ kind: string, title: string }} a 첫 문서.
 * @param {{ kind: string, title: string }} b 두 번째 문서.
 * @returns {number} sort comparator 결과.
 */
function routeSort(a, b) {
  const order = { core: 0, pattern: 1, tag: 2, raw: 3, meta: 4 };
  const kindDiff = (order[a.kind] ?? 9) - (order[b.kind] ?? 9);
  if (kindDiff) return kindDiff;
  return a.title.localeCompare(b.title, "ko");
}

/**
 * 문서 kind를 화면 표시용 한글 label로 바꾼다.
 *
 * @param {string} kind 문서 kind.
 * @returns {string} 한글 label.
 */
function docKindLabel(kind) {
  return {
    core: "핵심",
    pattern: "패턴",
    raw: "원문",
    tag: "태그",
    meta: "메타",
    history: "히스토리"
  }[kind] || kind;
}

/**
 * frontmatter 또는 inline tag 값을 정규화한다.
 *
 * @param {unknown} value tag 후보 값.
 * @returns {string} 정규화된 tag 문자열.
 */
function normalizeTag(value) {
  return String(value || "")
    .replace(/^#/, "")
    .replace(/^tag:\s*/i, "")
    .trim();
}

/**
 * Obsidian wikilink로 표현된 tag link를 본문에서 추출한다.
 *
 * @param {string} markdown Markdown 본문.
 * @returns {string[]} 정렬된 inline tag 목록.
 */
function extractInlineTags(markdown) {
  const tags = new Set();
  for (const match of markdown.matchAll(/\[\[wiki\/tags\/([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g)) {
    const target = match[1].replace(/\.md$/i, "");
    if (target) tags.add(target);
  }
  return [...tags].sort();
}

/**
 * frontmatter `tags` 값을 문자열 배열로 정규화한다.
 *
 * @param {unknown} value frontmatter tags 값.
 * @returns {string[]} 정규화된 tag 목록.
 */
function frontmatterTags(value) {
  if (Array.isArray(value)) return value.map(normalizeTag).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [normalizeTag(value)];
  return [];
}

/**
 * plan wiki의 Markdown 문서들을 읽어 사이트 렌더링 모델로 변환한다.
 *
 * @returns {Promise<object[]>} 문서 metadata와 본문을 담은 정렬된 문서 배열.
 */
async function loadMarkdownDocs() {
  const docs = [];

  for (const rootConfig of documentRoots) {
    const rootDir = path.join(wikiRoot, ...rootConfig.root.split("/"));
    const files = (await listFiles(rootDir)).filter((file) => file.toLowerCase().endsWith(".md"));

    for (const filePath of files) {
      const sourcePath = sourcePathFor(filePath);
      if (sourcePath.endsWith("/index.md")) continue;
      const raw = await readFile(filePath, "utf8");
      const info = await stat(filePath);
      const parsed = parseFrontmatter(raw);
      const title = String(parsed.data.title || firstHeading(parsed.content) || slugFromPath(filePath));
      const summary = trimSummary(parsed.data.summary || firstParagraph(parsed.content));
      const route = routeFor(rootConfig, sourcePath);
      const tags = [...new Set([...frontmatterTags(parsed.data.tags), ...extractInlineTags(parsed.content)])].sort();
      const bodyText = stripMarkdown(parsed.content);

      docs.push({
        id: createHash("sha1").update(sourcePath).digest("hex").slice(0, 12),
        kind: rootConfig.kind,
        kind_label: docKindLabel(rootConfig.kind),
        source_path: sourcePath,
        route,
        title,
        summary,
        tags,
        body_text: bodyText,
        content: parsed.content,
        frontmatter: parsed.data,
        updated_at: info.mtime.toISOString()
      });
    }
  }

  return docs.sort(routeSort);
}

/**
 * 문서 하나가 받을 수 있는 wikilink/route alias 후보를 만든다.
 *
 * @param {{ source_path: string, route: string }} doc 문서 모델.
 * @returns {string[]} alias 후보 목록.
 */
function routeAliasesForDoc(doc) {
  const withoutExt = doc.source_path.replace(/\.md$/i, "");
  const basename = withoutExt.split("/").pop();
  return [
    doc.source_path,
    withoutExt,
    basename,
    doc.route.replace(/^\//, "")
  ].filter(Boolean);
}

/**
 * wikilink target을 사이트 route로 바꾸기 위한 alias map을 만든다.
 *
 * basename이 중복되는 경우 basename alias는 제외한다.
 *
 * @param {object[]} docs 문서 모델 배열.
 * @returns {Map<string, string>} alias와 route의 map.
 */
function buildRouteMap(docs) {
  const routeMap = new Map();
  const basenameCounts = new Map();
  for (const doc of docs) {
    const basename = doc.source_path.replace(/\.md$/i, "").split("/").pop();
    basenameCounts.set(basename, (basenameCounts.get(basename) || 0) + 1);
  }

  for (const doc of docs) {
    for (const alias of routeAliasesForDoc(doc)) {
      if (alias === doc.source_path.replace(/\.md$/i, "").split("/").pop() && basenameCounts.get(alias) > 1) {
        continue;
      }
      routeMap.set(alias, doc.route);
    }
  }
  return routeMap;
}

/**
 * history JSON record를 읽어 사이트 목록 모델로 변환한다.
 *
 * @returns {Promise<object[]>} 최신순 history record 배열.
 */
async function loadHistory() {
  const historyRoot = path.join(wikiRoot, "history");
  const files = (await listFiles(historyRoot)).filter((file) => file.toLowerCase().endsWith(".json"));
  const records = [];

  for (const filePath of files) {
    const record = await readJson(filePath, null);
    if (!record || typeof record !== "object") continue;
    const sourcePath = sourcePathFor(filePath);
    const id = record.id || slugFromPath(filePath);
    records.push({
      ...record,
      id,
      source_path: sourcePath,
      route: `/history/${encodeURIComponent(id)}`,
      title: `${record.type || "history"} · ${record.status || "unknown"} · ${id}`,
      summary: record.summary || "",
      updated_at: record.finished_at || record.started_at || ""
    });
  }

  return records.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

/**
 * feedback outcome 디렉터리의 JSON record를 읽는다.
 *
 * @returns {Promise<object[]>} 생성 시각 역순 feedback record 배열.
 */
async function loadFeedback() {
  const root = path.join(wikiRoot, "feedback");
  const records = [];

  for (const status of feedbackStatuses) {
    const dir = path.join(root, status);
    const files = (await listFiles(dir)).filter((file) => file.toLowerCase().endsWith(".json"));
    for (const filePath of files) {
      const record = await readJson(filePath, null);
      if (!record || typeof record !== "object") continue;
      records.push({
        ...record,
        status: record.status || status,
        source_path_on_disk: sourcePathFor(filePath)
      });
    }
  }

  return records.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

/**
 * 현재 요청 처리에 필요한 plan wiki 문서 사이트 모델을 로드한다.
 *
 * @returns {Promise<object>} 문서, route map, history, feedback, 오류 상태를 담은 모델.
 */
async function loadModel() {
  const exists = await pathExists(wikiRoot);
  if (!exists) {
    return { ok: false, wikiRoot, docs: [], history: [], feedback: [], routeMap: new Map(), errors: ["source root not found"] };
  }

  const docs = await loadMarkdownDocs();
  const history = await loadHistory();
  const feedback = await loadFeedback();
  const routeMap = buildRouteMap(docs);
  const byRoute = new Map(docs.map((doc) => [doc.route, doc]));
  const bySourcePath = new Map(docs.map((doc) => [doc.source_path, doc]));

  return { ok: true, wikiRoot, docs, history, feedback, routeMap, byRoute, bySourcePath, errors: [] };
}

/**
 * Obsidian wikilink target을 현재 사이트 route로 해석한다.
 *
 * @param {string} target wikilink target.
 * @param {Map<string, string>} routeMap alias와 route의 map.
 * @returns {string | null} 해석된 route 또는 없으면 `null`.
 */
function resolveWikiLink(target, routeMap) {
  const [pathPart, hashPart] = String(target || "").split("#");
  const normalized = pathPart.replace(/\\/g, "/").replace(/^\//, "").replace(/\.md$/i, "");
  const candidates = [
    normalized,
    `${normalized}.md`,
    normalized.replace(/^wiki\//, ""),
    `wiki/${normalized}`,
    normalized.split("/").pop()
  ];

  for (const candidate of candidates) {
    if (routeMap.has(candidate)) {
      const route = routeMap.get(candidate);
      return hashPart ? `${route}#${encodeURIComponent(hashPart)}` : route;
    }
  }

  return null;
}

/**
 * link href로 허용할 수 있는 안전한 URL만 반환한다.
 *
 * @param {unknown} value URL 후보.
 * @returns {string} 허용된 URL 또는 `#`.
 */
function safeUrl(value) {
  const url = String(value || "").trim();
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url.startsWith("#")) return url;
  return "#";
}

/**
 * Markdown inline 변환 중 HTML token을 임시 보관하는 작은 factory.
 *
 * @returns {{ put(html: string): string, restore(html: string): string }} token 저장/복원 API.
 */
function tokenFactory() {
  const tokens = [];
  return {
    put(html) {
      const id = tokens.length;
      tokens.push(html);
      return `@@TOKEN_${id}@@`;
    },
    restore(html) {
      return html.replace(/@@TOKEN_(\d+)@@/g, (_, id) => tokens[Number(id)] || "");
    }
  };
}

/**
 * 제한된 Markdown inline 문법을 HTML로 변환한다.
 *
 * @param {string} text inline Markdown text.
 * @param {Map<string, string>} routeMap wikilink route map.
 * @returns {string} HTML inline fragment.
 */
function inlineMarkdown(text, routeMap) {
  const tokens = tokenFactory();
  let value = String(text || "");

  value = value.replace(/`([^`]+)`/g, (_, code) => tokens.put(`<code>${escapeHtml(code)}</code>`));
  value = value.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, label) => {
    const href = resolveWikiLink(target, routeMap);
    const attrs = href ? ` href="${escapeAttr(href)}"` : ' href="#" aria-disabled="true"';
    return tokens.put(`<a${attrs}>${escapeHtml(label)}</a>`);
  });
  value = value.replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
    const href = resolveWikiLink(target, routeMap);
    const label = target.split("#")[0].split("/").pop();
    const attrs = href ? ` href="${escapeAttr(href)}"` : ' href="#" aria-disabled="true"';
    return tokens.put(`<a${attrs}>${escapeHtml(label)}</a>`);
  });
  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const href = safeUrl(resolveWikiLink(url, routeMap) || url);
    const external = /^https?:/i.test(href) ? ' target="_blank" rel="noreferrer"' : "";
    return tokens.put(`<a href="${escapeAttr(href)}"${external}>${escapeHtml(label)}</a>`);
  });

  let html = escapeHtml(value);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return tokens.restore(html);
}

/**
 * heading text를 anchor id로 사용할 수 있는 안정적인 문자열로 바꾼다.
 *
 * @param {string} text heading text.
 * @returns {string} HTML id.
 */
function headingId(text) {
  const base = String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (base) return base;
  return `heading-${createHash("sha1").update(String(text)).digest("hex").slice(0, 8)}`;
}

/**
 * GitHub-flavored Markdown 표 블록을 HTML table로 변환한다.
 *
 * @param {string[]} lines table markdown lines.
 * @param {Map<string, string>} routeMap wikilink route map.
 * @returns {string} HTML table fragment.
 */
function renderTable(lines, routeMap) {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim())
  );
  const header = rows[0] || [];
  const body = rows.slice(2);
  return `<div class="table-scroll"><table><thead><tr>${header
    .map((cell) => `<th>${inlineMarkdown(cell, routeMap)}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell, routeMap)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

/**
 * 제한된 Markdown block 문법을 문서 화면용 HTML로 변환한다.
 *
 * @param {string} markdown Markdown 본문.
 * @param {Map<string, string>} routeMap wikilink route map.
 * @returns {string} HTML fragment.
 */
function markdownToHtml(markdown, routeMap) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let paragraph = [];
  let code = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    out.push(`<p>${inlineMarkdown(paragraph.join(" "), routeMap)}</p>`);
    paragraph = [];
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (code) {
      if (/^```/.test(line)) {
        out.push(`<pre><code>${escapeHtml(code.lines.join("\n"))}</code></pre>`);
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }

    const fence = line.match(/^```(\S*)/);
    if (fence) {
      flushParagraph();
      code = { lang: fence[1], lines: [] };
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const text = heading[2].trim();
      out.push(`<h${level} id="${escapeAttr(headingId(text))}">${inlineMarkdown(text, routeMap)}</h${level}>`);
      continue;
    }

    if (/^\s*\|.+\|\s*$/.test(line) && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] || "")) {
      flushParagraph();
      const tableLines = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      i -= 1;
      out.push(renderTable(tableLines, routeMap));
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      const items = [unordered[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\s*[-*]\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      out.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item, routeMap)}</li>`).join("")}</ul>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      const items = [ordered[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\s*\d+\.\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      out.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item, routeMap)}</li>`).join("")}</ol>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      const items = [quote[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^>\s?(.*)$/);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      out.push(`<blockquote>${inlineMarkdown(items.join(" "), routeMap)}</blockquote>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      out.push("<hr>");
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  if (code) {
    out.push(`<pre><code>${escapeHtml(code.lines.join("\n"))}</code></pre>`);
  }

  return out.join("\n");
}

/**
 * 문서 배열을 kind별 그룹으로 묶는다.
 *
 * @param {object[]} docs 문서 모델 배열.
 * @returns {Map<string, object[]>} kind별 문서 그룹.
 */
function groupByKind(docs) {
  const groups = new Map();
  for (const doc of docs) {
    if (!groups.has(doc.kind)) groups.set(doc.kind, []);
    groups.get(doc.kind).push(doc);
  }
  return groups;
}

/**
 * 현재 route와 비교해 active class가 붙은 sidebar navigation link를 만든다.
 *
 * @param {string} href link href.
 * @param {string} label link label.
 * @param {string} currentPath 현재 요청 pathname.
 * @returns {string} HTML anchor fragment.
 */
function navLink(href, label, currentPath) {
  const active = href === currentPath || (href !== "/" && currentPath.startsWith(`${href}/`));
  return `<a class="${active ? "active" : ""}" href="${escapeAttr(href)}">${escapeHtml(label)}</a>`;
}

/**
 * 문서 kind별 navigation sidebar를 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @param {string} currentPath 현재 요청 pathname.
 * @returns {string} sidebar HTML.
 */
function renderSidebar(model, currentPath) {
  const groups = groupByKind(model.docs);
  const core = groups.get("core") || [];
  const patterns = groups.get("pattern") || [];
  const tags = groups.get("tag") || [];
  const raw = groups.get("raw") || [];
  const meta = groups.get("meta") || [];

  const section = (title, docs, limit = 40) => {
    if (!docs.length) return "";
    return `<section class="side-section"><h2>${escapeHtml(title)}</h2>${docs
      .slice(0, limit)
      .map((doc) => navLink(doc.route, doc.title, currentPath))
      .join("")}${docs.length > limit ? `<p class="side-more">+${docs.length - limit}개 더 보기</p>` : ""}</section>`;
  };

  return `<aside class="sidebar">
    <div class="side-search">
      <label for="site-search">검색</label>
      <input id="site-search" type="search" autocomplete="off" placeholder="정책, 패턴, 태그 검색">
      <div id="search-results" class="search-results" hidden></div>
    </div>
    <nav>
      <section class="side-section">
        <h2>문서</h2>
        ${navLink("/", "홈", currentPath)}
        ${navLink("/history", "히스토리", currentPath)}
        ${navLink("/feedback", "피드백", currentPath)}
      </section>
      ${section("핵심 정책", core)}
      ${section("패턴", patterns, 60)}
      ${section("태그", tags, 80)}
      ${section("원문 리뷰", raw, 30)}
      ${section("메타", meta)}
    </nav>
  </aside>`;
}

/**
 * 상단 bar와 문서 통계를 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @returns {string} topbar HTML.
 */
function renderTopbar(model) {
  const patternCount = model.docs.filter((doc) => doc.kind === "pattern").length;
  const rawCount = model.docs.filter((doc) => doc.kind === "raw").length;
  const inboxCount = model.feedback.filter((item) => item.status === "inbox").length;
  return `<header class="topbar">
    <a class="brand" href="/">Plan Wiki Docs</a>
    <div class="top-stats">
      <span>${patternCount} patterns</span>
      <span>${rawCount} raw</span>
      <span>${model.history.length} history</span>
      <span>${inboxCount} inbox</span>
    </div>
  </header>`;
}

/**
 * 공통 HTML shell을 렌더링한다.
 *
 * @param {object} options layout 입력.
 * @param {object} options.model 사이트 모델.
 * @param {string} options.currentPath 현재 요청 pathname.
 * @param {string} options.title 문서 제목.
 * @param {string} options.content main content HTML.
 * @param {object | null} [options.document=null] feedback 대상 문서 metadata.
 * @returns {string} 완성된 HTML 문서.
 */
function renderLayout({ model, currentPath, title, content, document = null }) {
  const documentAttrs = document
    ? ` data-document="true" data-source-path="${escapeAttr(document.source_path)}" data-title="${escapeAttr(document.title)}" data-kind="${escapeAttr(document.kind)}"`
    : "";
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Plan Wiki Docs</title>
  <style>${styles()}</style>
</head>
<body>
  ${renderTopbar(model)}
  <div class="shell">
    ${renderSidebar(model, currentPath)}
    <main class="content">
      <article class="doc"${documentAttrs}>
        ${content}
      </article>
    </main>
  </div>
  <div id="feedback-popover" class="feedback-popover" hidden>
    <form id="feedback-form">
      <div class="feedback-head">
        <strong>선택 영역 피드백</strong>
        <button type="button" id="feedback-close" aria-label="닫기">×</button>
      </div>
      <label>
        유형
        <select id="feedback-type">
          <option value="wording">문장 개선</option>
          <option value="typo">오탈자</option>
          <option value="terminology">용어</option>
          <option value="missing-explanation">설명 보강</option>
          <option value="missing-condition">조건 보강</option>
          <option value="missing-example">예시 보강</option>
          <option value="raw-link">원문 연결</option>
          <option value="tag-link">태그 연결</option>
          <option value="pattern-semantics">패턴 의미 변경</option>
          <option value="docs-ui">문서 UI</option>
        </select>
      </label>
      <label>
        의견
        <textarea id="feedback-comment" rows="5" placeholder="이 문장을 어떻게 고치면 좋을지 적어주세요."></textarea>
      </label>
      <p id="feedback-status" class="feedback-status"></p>
      <button class="primary" type="submit">저장</button>
    </form>
  </div>
  <script>${clientScript()}</script>
</body>
</html>`;
}

/**
 * 홈 화면을 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @returns {string} 홈 HTML 문서.
 */
function renderHome(model) {
  const core = model.docs.filter((doc) => doc.kind === "core");
  const patterns = model.docs.filter((doc) => doc.kind === "pattern");
  const tags = model.docs.filter((doc) => doc.kind === "tag");
  const recentHistory = model.history.slice(0, 8);
  const recentFeedback = model.feedback.slice(0, 8);

  const cardList = (items) =>
    items
      .map(
        (item) => `<a class="item" href="${escapeAttr(item.route || item.doc_url || "#")}">
          <span class="item-kind">${escapeHtml(item.kind_label || item.type || item.status || "item")}</span>
          <strong>${escapeHtml(item.title || item.id || item.source_path || "제목 없음")}</strong>
          <small>${escapeHtml(item.summary || item.feedback?.comment || item.created_at || "")}</small>
        </a>`
      )
      .join("");

  const content = `<header class="doc-head">
    <p class="eyebrow">source: ${escapeHtml(model.wikiRoot)}</p>
    <h1>Plan Wiki Docs</h1>
    <p class="lead">기존 plan wiki를 그대로 읽어 공식 문서처럼 탐색하고, 선택 영역 피드백을 JSON으로 남기는 로컬 문서 화면입니다.</p>
  </header>
  <section class="overview-grid">
    <div class="metric"><strong>${core.length}</strong><span>핵심 정책</span></div>
    <div class="metric"><strong>${patterns.length}</strong><span>패턴</span></div>
    <div class="metric"><strong>${tags.length}</strong><span>태그 문서</span></div>
    <div class="metric"><strong>${model.history.length}</strong><span>히스토리</span></div>
  </section>
  <section>
    <h2>핵심 정책</h2>
    <div class="item-grid">${cardList(core)}</div>
  </section>
  <section>
    <h2>최근 히스토리</h2>
    <div class="item-grid">${cardList(recentHistory)}</div>
  </section>
  <section>
    <h2>최근 피드백</h2>
    <div class="item-grid">${cardList(recentFeedback)}</div>
  </section>`;

  return renderLayout({ model, currentPath: "/", title: "홈", content });
}

/**
 * 개별 Markdown 문서 화면을 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @param {object} doc 문서 모델.
 * @param {string} currentPath 현재 요청 pathname.
 * @returns {string} 문서 HTML.
 */
function renderDocument(model, doc, currentPath) {
  const tagLinks = doc.tags
    .map((tag) => {
      const href = resolveWikiLink(`wiki/tags/${tag}`, model.routeMap) || `/tags/${tag}`;
      return `<a class="tag" href="${escapeAttr(href)}">${escapeHtml(tag)}</a>`;
    })
    .join("");

  const content = `<header class="doc-head">
    <p class="eyebrow">${escapeHtml(doc.kind_label)} · ${escapeHtml(doc.source_path)}</p>
    <h1>${escapeHtml(doc.title)}</h1>
    ${doc.summary ? `<p class="lead">${escapeHtml(doc.summary)}</p>` : ""}
    ${tagLinks ? `<div class="tag-row">${tagLinks}</div>` : ""}
  </header>
  ${markdownToHtml(documentBodyMarkdown(doc), model.routeMap)}`;

  return renderLayout({ model, currentPath, title: doc.title, content, document: doc });
}

/**
 * history record의 changes 요약 문자열을 만든다.
 *
 * @param {object | null | undefined} changes history changes 객체.
 * @returns {string} 생성/수정/삭제/registry 변경 요약.
 */
function summarizeChanges(changes) {
  if (!changes || typeof changes !== "object") return "";
  const parts = [];
  for (const key of ["created", "updated", "deleted"]) {
    const count = Array.isArray(changes[key]) ? changes[key].length : 0;
    if (count) parts.push(`${key}: ${count}`);
  }
  if (changes.registry_changed) parts.push("registry changed");
  return parts.join(" · ");
}

/**
 * history 목록 화면을 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @param {string} currentPath 현재 요청 pathname.
 * @param {string | null} [filterType=null] `ingest` 또는 `feedback` filter.
 * @returns {string} history 목록 HTML.
 */
function renderHistoryIndex(model, currentPath, filterType = null) {
  const records = filterType ? model.history.filter((item) => item.type === filterType) : model.history;
  const title = filterType ? `${filterType} 히스토리` : "히스토리";
  const tabs = `<div class="tabs">
    <a class="${!filterType ? "active" : ""}" href="/history">전체</a>
    <a class="${filterType === "ingest" ? "active" : ""}" href="/history/ingest">ingest</a>
    <a class="${filterType === "feedback" ? "active" : ""}" href="/history/feedback">feedback</a>
  </div>`;
  const rows = records
    .map(
      (item) => `<tr>
        <td><a href="${escapeAttr(item.route)}">${escapeHtml(item.id)}</a></td>
        <td><span class="pill">${escapeHtml(item.type || "")}</span></td>
        <td><span class="status ${escapeAttr(item.status || "")}">${escapeHtml(item.status || "")}</span></td>
        <td>${escapeHtml(item.summary || summarizeChanges(item.changes))}</td>
        <td>${escapeHtml(item.finished_at || item.started_at || "")}</td>
      </tr>`
    )
    .join("");
  const content = `<header class="doc-head">
    <p class="eyebrow">history/**/*.json</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="lead">ingest와 feedback 적용 이력을 원문 wiki와 분리된 감사 로그로 확인합니다.</p>
  </header>
  ${tabs}
  <div class="table-scroll"><table>
    <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Summary</th><th>Finished</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">히스토리 기록이 없습니다.</td></tr>'}</tbody>
  </table></div>`;
  return renderLayout({ model, currentPath, title, content });
}

/**
 * history record 상세 화면을 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @param {object} record history record.
 * @param {string} currentPath 현재 요청 pathname.
 * @returns {string} history 상세 HTML.
 */
function renderHistoryDetail(model, record, currentPath) {
  const changes = record.changes || {};
  const list = (title, values) => {
    if (!Array.isArray(values) || !values.length) return "";
    return `<h2>${escapeHtml(title)}</h2><ul>${values.map((item) => `<li><code>${escapeHtml(typeof item === "string" ? item : JSON.stringify(item))}</code></li>`).join("")}</ul>`;
  };
  const content = `<header class="doc-head">
    <p class="eyebrow">${escapeHtml(record.source_path || "history")}</p>
    <h1>${escapeHtml(record.id)}</h1>
    ${record.summary ? `<p class="lead">${escapeHtml(record.summary)}</p>` : ""}
    <div class="tag-row">
      <span class="tag">${escapeHtml(record.type || "history")}</span>
      <span class="tag">${escapeHtml(record.status || "unknown")}</span>
    </div>
  </header>
  <h2>개요</h2>
  <dl class="meta-list">
    <div><dt>시작</dt><dd>${escapeHtml(record.started_at || "")}</dd></div>
    <div><dt>종료</dt><dd>${escapeHtml(record.finished_at || "")}</dd></div>
    <div><dt>Actor</dt><dd>${escapeHtml(record.actor || "")}</dd></div>
  </dl>
  ${list("입력", record.inputs)}
  ${list("생성", changes.created)}
  ${list("수정", changes.updated)}
  ${list("삭제", changes.deleted)}
  ${list("이동", changes.moved)}
  <h2>Raw JSON</h2>
  <pre><code>${escapeHtml(JSON.stringify(record, null, 2))}</code></pre>`;

  return renderLayout({ model, currentPath, title: record.id, content });
}

/**
 * feedback 목록과 상태별 개수를 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @param {string} currentPath 현재 요청 pathname.
 * @returns {string} feedback 목록 HTML.
 */
function renderFeedbackIndex(model, currentPath) {
  const counts = new Map(feedbackStatuses.map((status) => [status, 0]));
  for (const item of model.feedback) {
    counts.set(item.status, (counts.get(item.status) || 0) + 1);
  }
  const summary = feedbackStatuses
    .map((status) => `<div class="metric"><strong>${counts.get(status) || 0}</strong><span>${escapeHtml(status)}</span></div>`)
    .join("");
  const rows = model.feedback
    .map(
      (item) => `<tr>
        <td><code>${escapeHtml(item.id || "")}</code></td>
        <td><span class="status ${escapeAttr(item.status || "")}">${escapeHtml(item.status || "")}</span></td>
        <td>${item.doc_url ? `<a href="${escapeAttr(item.doc_url)}">${escapeHtml(item.title || item.source_path || item.doc_url)}</a>` : escapeHtml(item.title || item.source_path || "")}</td>
        <td>${escapeHtml(item.feedback?.type || "")}</td>
        <td>${escapeHtml(trimSummary(item.feedback?.comment || "", 120))}</td>
        <td>${escapeHtml(item.created_at || "")}</td>
      </tr>`
    )
    .join("");
  const content = `<header class="doc-head">
    <p class="eyebrow">feedback/**/*.json</p>
    <h1>피드백</h1>
    <p class="lead">문서 화면에서 저장된 선택 영역 피드백과 처리 상태입니다.</p>
  </header>
  <section class="overview-grid">${summary}</section>
  <div class="table-scroll"><table>
    <thead><tr><th>ID</th><th>Status</th><th>Document</th><th>Type</th><th>Comment</th><th>Created</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">피드백 기록이 없습니다.</td></tr>'}</tbody>
  </table></div>`;
  return renderLayout({ model, currentPath, title: "피드백", content });
}

/**
 * 404 화면을 렌더링한다.
 *
 * @param {object} model 사이트 모델.
 * @param {string} currentPath 현재 요청 pathname.
 * @returns {string} 404 HTML.
 */
function renderNotFound(model, currentPath) {
  return renderLayout({
    model,
    currentPath,
    title: "Not found",
    content: `<header class="doc-head"><h1>문서를 찾을 수 없습니다</h1><p class="lead">${escapeHtml(currentPath)}</p></header>`
  });
}

/**
 * plan wiki source root가 없을 때 보여줄 오류 화면을 렌더링한다.
 *
 * @param {object} model 실패 상태의 사이트 모델.
 * @returns {string} 오류 HTML.
 */
function renderMissingWiki(model) {
  const content = `<header class="doc-head">
    <p class="eyebrow">configuration</p>
    <h1>Plan wiki root를 찾을 수 없습니다</h1>
    <p class="lead"><code>${escapeHtml(model.wikiRoot)}</code> 경로가 없습니다. <code>--source-root</code> 또는 <code>PLAN_WIKI_SOURCE_ROOT</code>로 경로를 지정하세요.</p>
  </header>`;
  return renderLayout({ model: { ...model, docs: [], history: [], feedback: [] }, currentPath: "/", title: "Missing wiki", content });
}

/**
 * 클라이언트 검색 UI가 사용할 search index payload를 만든다.
 *
 * @param {object} model 사이트 모델.
 * @returns {object[]} 검색 대상 문서 배열.
 */
function searchPayload(model) {
  return model.docs.map((doc) => ({
    kind: doc.kind,
    kind_label: doc.kind_label,
    source_path: doc.source_path,
    route: doc.route,
    title: doc.title,
    summary: doc.summary,
    tags: doc.tags,
    text: `${doc.title} ${doc.summary} ${doc.tags.join(" ")} ${doc.source_path} ${doc.body_text}`.slice(0, 20000)
  }));
}

/**
 * feedback이 가리키는 source path가 현재 로드된 문서인지 확인한다.
 *
 * @param {object} model 사이트 모델.
 * @param {unknown} sourcePath feedback source path 후보.
 * @returns {boolean} 현재 문서 목록에 있으면 `true`.
 */
function isKnownSourcePath(model, sourcePath) {
  return typeof sourcePath === "string" && model.bySourcePath?.has(sourcePath);
}

/**
 * feedback type을 안전한 machine-readable 값으로 정규화한다.
 *
 * @param {unknown} value feedback type 후보.
 * @returns {string} 안전한 type 값.
 */
function sanitizeFeedbackType(value) {
  const text = String(value || "wording").trim();
  return /^[a-z0-9-]{2,40}$/.test(text) ? text : "wording";
}

/**
 * feedback comment의 trailing whitespace와 최대 길이를 제한한다.
 *
 * @param {unknown} value comment 후보.
 * @returns {string} 저장 가능한 comment.
 */
function sanitizeComment(value) {
  return String(value || "").replace(/\s+$/g, "").slice(0, 4000);
}

/**
 * 지정 Date를 Asia/Seoul 기준 날짜/시간 part로 분해한다.
 *
 * @param {Date} [date=new Date()] 변환할 Date.
 * @returns {Record<string, string>} Intl part type별 값.
 */
function kstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return byType;
}

/**
 * 현재 시각을 KST ISO 유사 문자열로 반환한다.
 *
 * @returns {string} `YYYY-MM-DDTHH:mm:ss+09:00` 형식 문자열.
 */
function nowKstIso() {
  const p = kstParts();
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+09:00`;
}

/**
 * 현재 시각을 파일명에 넣기 좋은 KST stamp로 반환한다.
 *
 * @returns {string} `YYYYMMDD-HHMMSS` 형식 문자열.
 */
function nowKstStamp() {
  const p = kstParts();
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}`;
}

/**
 * source path를 feedback 파일명에 넣을 안전한 slug로 바꾼다.
 *
 * @param {unknown} value source path 또는 제목 후보.
 * @returns {string} 파일명 slug.
 */
function slugifyForFile(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/\.md$/i, "")
    .split("/")
    .pop()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "feedback";
}

/**
 * 선택 영역 feedback POST 요청을 검증하고 `feedback/inbox` JSON record로 저장한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {object} model 사이트 모델.
 * @returns {Promise<void>}
 */
async function handleFeedbackPost(req, res, model) {
  let payload = null;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (error) {
    return sendJson(res, 400, { error: `invalid json: ${error.message}` });
  }

  if (!payload || typeof payload !== "object") {
    return sendJson(res, 400, { error: "feedback must be an object" });
  }

  const sourcePath = String(payload.source_path || "");
  if (!isKnownSourcePath(model, sourcePath)) {
    return sendJson(res, 400, { error: "unknown source_path" });
  }

  const quote = String(payload.selection?.quote || "").trim();
  const comment = sanitizeComment(payload.feedback?.comment);
  if (!quote) {
    return sendJson(res, 400, { error: "selection.quote is required" });
  }
  if (!comment) {
    return sendJson(res, 400, { error: "feedback.comment is required" });
  }

  const doc = model.bySourcePath.get(sourcePath);
  const id = `${nowKstStamp()}-${slugifyForFile(sourcePath)}-${randomBytes(2).toString("hex")}`;
  const record = {
    id,
    status: "inbox",
    source_path: sourcePath,
    doc_url: doc.route,
    title: doc.title,
    selection: {
      quote: quote.slice(0, 2000),
      prefix: String(payload.selection?.prefix || "").slice(-500),
      suffix: String(payload.selection?.suffix || "").slice(0, 500),
      anchor: String(payload.selection?.anchor || "").slice(0, 200)
    },
    feedback: {
      type: sanitizeFeedbackType(payload.feedback?.type),
      comment
    },
    created_at: nowKstIso(),
    user_agent: String(payload.user_agent || "").slice(0, 500)
  };

  const inboxDir = path.join(wikiRoot, "feedback", "inbox");
  await mkdir(inboxDir, { recursive: true });
  const filePath = path.join(inboxDir, `${id}.json`);
  await writeJsonAtomic(filePath, record);
  return sendJson(res, 201, { ok: true, id, path: sourcePathFor(filePath) });
}

/**
 * 문서 사이트의 CSS를 문자열로 반환한다.
 *
 * @returns {string} `<style>`에 삽입할 CSS.
 */
function styles() {
  return `
:root {
  color-scheme: light;
  --bg: #f8f7f3;
  --panel: #ffffff;
  --text: #252525;
  --muted: #6d6a62;
  --line: #ded8ca;
  --soft: #efebe2;
  --accent: #0f766e;
  --accent-2: #9a3412;
  --code: #f3f0e8;
  --shadow: 0 18px 40px rgba(39, 35, 27, 0.12);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Inter", "Pretendard", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.65;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 0 24px;
  background: rgba(248, 247, 243, 0.94);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}
.brand {
  color: var(--text);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
}
.top-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}
.shell {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  min-height: calc(100vh - 56px);
}
.sidebar {
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow: auto;
  padding: 20px 16px 32px;
  border-right: 1px solid var(--line);
  background: #fbfaf7;
}
.side-search label,
.feedback-popover label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}
input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: var(--text);
  font: inherit;
}
input,
select { min-height: 36px; padding: 7px 10px; }
textarea { resize: vertical; padding: 9px 10px; }
.search-results {
  margin-top: 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.search-results a {
  display: block;
  padding: 10px;
  border-bottom: 1px solid var(--soft);
}
.search-results a:last-child { border-bottom: 0; }
.search-results small {
  display: block;
  color: var(--muted);
}
.side-section { margin-top: 22px; }
.side-section h2 {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.side-section a {
  display: block;
  padding: 7px 9px;
  border-radius: 6px;
  color: #38352f;
  font-size: 13px;
  line-height: 1.35;
}
.side-section a.active {
  background: var(--soft);
  color: var(--accent-2);
  font-weight: 750;
}
.side-more {
  margin: 8px 9px 0;
  color: var(--muted);
  font-size: 12px;
}
.content {
  min-width: 0;
  padding: 38px min(7vw, 76px) 80px;
}
.doc {
  max-width: 980px;
  margin: 0 auto;
}
.doc-head {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 28px;
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
}
h1,
h2,
h3,
h4 {
  line-height: 1.25;
  letter-spacing: 0;
}
h1 {
  margin: 0;
  font-size: clamp(30px, 5vw, 52px);
}
h2 {
  margin: 36px 0 12px;
  font-size: 24px;
}
h3 {
  margin: 28px 0 8px;
  font-size: 19px;
}
p,
ul,
ol,
blockquote,
pre,
.table-scroll {
  margin: 14px 0;
}
.lead {
  max-width: 760px;
  color: #4c4942;
  font-size: 17px;
}
code {
  border-radius: 4px;
  background: var(--code);
  padding: 0.12em 0.32em;
  font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 0.92em;
}
pre {
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #211f1b;
  padding: 16px;
}
pre code {
  background: transparent;
  color: #f6f1e6;
  padding: 0;
}
blockquote {
  border-left: 4px solid var(--accent);
  margin-left: 0;
  padding-left: 16px;
  color: #4c4942;
}
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th,
td {
  border-bottom: 1px solid var(--soft);
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
}
th {
  background: #f1eee7;
  font-size: 12px;
  text-transform: uppercase;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.tag,
.pill,
.status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 8px;
  background: #fff;
  color: #4b4840;
  font-size: 12px;
  font-weight: 700;
}
.status.success,
.status.applied { color: #0f766e; }
.status.blocked,
.status.needs-decision { color: #9a3412; }
.status.failed,
.status.rejected { color: #b91c1c; }
.overview-grid,
.item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.metric,
.item {
  display: block;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}
.metric strong {
  display: block;
  font-size: 28px;
  line-height: 1;
}
.metric span,
.item small,
.item-kind {
  color: var(--muted);
  font-size: 12px;
}
.item strong {
  display: block;
  color: var(--text);
  margin: 5px 0;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.tabs a {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 12px;
  background: #fff;
  color: var(--text);
  font-size: 13px;
  font-weight: 750;
}
.tabs a.active {
  border-color: var(--accent);
  color: var(--accent);
}
.meta-list {
  display: grid;
  gap: 8px;
}
.meta-list div {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  border-bottom: 1px solid var(--soft);
  padding: 8px 0;
}
.meta-list dt {
  color: var(--muted);
  font-weight: 750;
}
.meta-list dd { margin: 0; }
.feedback-popover {
  position: fixed;
  z-index: 50;
  width: min(380px, calc(100vw - 24px));
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow);
  padding: 14px;
}
.feedback-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.feedback-head button {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
#feedback-form {
  display: grid;
  gap: 10px;
}
.primary {
  min-height: 36px;
  border: 0;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}
.feedback-status {
  min-height: 20px;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}
::selection {
  background: rgba(15, 118, 110, 0.24);
}
@media (max-width: 860px) {
  .topbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 16px;
  }
  .shell {
    display: block;
  }
  .sidebar {
    position: static;
    height: auto;
    max-height: 42vh;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .content {
    padding: 28px 18px 60px;
  }
  h1 {
    font-size: 34px;
  }
}
`;
}

/**
 * 문서 검색과 선택 영역 feedback popover를 처리하는 client-side script를 반환한다.
 *
 * 반환값은 HTML `<script>` 태그 안에 직접 삽입된다.
 *
 * @returns {string} browser에서 실행할 JavaScript 문자열.
 */
function clientScript() {
  return `
const searchInput = document.getElementById("site-search");
const searchResults = document.getElementById("search-results");
let searchIndex = null;

function plain(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

async function ensureSearchIndex() {
  if (searchIndex) return searchIndex;
  const response = await fetch("/api/search");
  searchIndex = await response.json();
  return searchIndex;
}

if (searchInput) {
  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      return;
    }
    const index = await ensureSearchIndex();
    const terms = query.split(/\\s+/).filter(Boolean);
    const matches = index
      .map((item) => {
        const haystack = String(item.text || "").toLowerCase();
        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 12);
    searchResults.innerHTML = matches.map(({ item }) => '<a href="' + plain(item.route) + '"><strong>' + plain(item.title) + '</strong><small>' + plain(item.kind_label + " · " + item.source_path) + '</small></a>').join("");
    searchResults.hidden = matches.length === 0;
  });
}

const article = document.querySelector("[data-document='true']");
const popover = document.getElementById("feedback-popover");
const form = document.getElementById("feedback-form");
const closeButton = document.getElementById("feedback-close");
const commentField = document.getElementById("feedback-comment");
const typeField = document.getElementById("feedback-type");
const statusField = document.getElementById("feedback-status");
let selectedFeedback = null;

function hideFeedback() {
  popover.hidden = true;
  selectedFeedback = null;
  statusField.textContent = "";
}

function selectionInsideArticle(selection) {
  if (!article || !selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  const node = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  return article.contains(node);
}

function selectionContext(quote) {
  const text = article.innerText || "";
  const index = text.indexOf(quote);
  if (index < 0) {
    return { prefix: "", suffix: "" };
  }
  return {
    prefix: text.slice(Math.max(0, index - 240), index),
    suffix: text.slice(index + quote.length, index + quote.length + 240)
  };
}

function showFeedbackForSelection(selection) {
  const quote = selection.toString().trim();
  if (!quote || quote.length < 2 || !selectionInsideArticle(selection)) {
    return;
  }
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const context = selectionContext(quote);
  selectedFeedback = {
    quote,
    prefix: context.prefix,
    suffix: context.suffix,
    anchor: location.hash || ""
  };
  const width = Math.min(380, window.innerWidth - 24);
  popover.style.visibility = "hidden";
  popover.hidden = false;
  const height = Math.min(popover.offsetHeight || 220, window.innerHeight - 24);
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
  const preferredTop = rect.bottom + 10;
  const fallbackTop = rect.top - height - 10;
  const top = preferredTop + height <= window.innerHeight - 12 ? preferredTop : fallbackTop;
  popover.style.left = left + "px";
  popover.style.top = Math.min(Math.max(12, top), window.innerHeight - height - 12) + "px";
  popover.style.visibility = "";
  commentField.focus();
}

if (article && popover) {
  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        showFeedbackForSelection(selection);
      }
    }, 0);
  });
}

if (closeButton) {
  closeButton.addEventListener("click", hideFeedback);
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedFeedback) {
      statusField.textContent = "선택 영역이 없습니다.";
      return;
    }
    const comment = commentField.value.trim();
    if (!comment) {
      statusField.textContent = "의견을 입력하세요.";
      return;
    }
    statusField.textContent = "저장 중...";
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source_path: article.dataset.sourcePath,
        doc_url: location.pathname,
        title: article.dataset.title,
        selection: selectedFeedback,
        feedback: {
          type: typeField.value,
          comment
        },
        user_agent: navigator.userAgent
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      statusField.textContent = result.error || "저장 실패";
      return;
    }
    statusField.textContent = "저장됨: " + result.id;
    commentField.value = "";
    window.getSelection()?.removeAllRanges();
    setTimeout(hideFeedback, 900);
  });
}
`;
}

/**
 * plan wiki docs 서버의 모든 HTTP 요청을 라우팅한다.
 *
 * API endpoint, 정적 asset, 문서 route, history/feedback 화면, 404를 처리한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @returns {Promise<void>}
 */
async function handleRequest(req, res) {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname.replace(/\/+$/, "") || "/");
  const model = await loadModel();

  if (pathname.startsWith("/assets/")) {
    const assetPath = path.resolve(repoRoot, pathname.slice(1));
    if (!assetPath.startsWith(`${repoRoot}${path.sep}`)) {
      return sendText(res, 403, "Forbidden");
    }
    return sendFile(res, assetPath);
  }

  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, model.ok ? 200 : 500, {
      ok: model.ok,
      wiki_root: model.wikiRoot,
      documents: model.docs.length,
      history: model.history.length,
      feedback: model.feedback.length,
      errors: model.errors
    });
  }

  if (pathname === "/api/search" && req.method === "GET") {
    return sendJson(res, 200, searchPayload(model));
  }

  if (pathname === "/api/feedback" && req.method === "POST") {
    if (!model.ok) return sendJson(res, 500, { error: "wiki root not found" });
    return handleFeedbackPost(req, res, model);
  }

  if (!model.ok) {
    return sendHtml(res, 500, renderMissingWiki(model));
  }

  if (pathname === "/") {
    return sendHtml(res, 200, renderHome(model));
  }

  if (pathname === "/history") {
    return sendHtml(res, 200, renderHistoryIndex(model, pathname));
  }

  if (pathname === "/history/ingest") {
    return sendHtml(res, 200, renderHistoryIndex(model, pathname, "ingest"));
  }

  if (pathname === "/history/feedback") {
    return sendHtml(res, 200, renderHistoryIndex(model, pathname, "feedback"));
  }

  if (pathname.startsWith("/history/")) {
    const id = decodeURIComponent(pathname.slice("/history/".length));
    const record = model.history.find((item) => item.id === id);
    if (record) {
      return sendHtml(res, 200, renderHistoryDetail(model, record, pathname));
    }
    return sendHtml(res, 404, renderNotFound(model, pathname));
  }

  if (pathname === "/feedback") {
    return sendHtml(res, 200, renderFeedbackIndex(model, pathname));
  }

  const doc = model.byRoute.get(pathname);
  if (doc) {
    return sendHtml(res, 200, renderDocument(model, doc, pathname));
  }

  return sendHtml(res, 404, renderNotFound(model, pathname));
}

/**
 * plan wiki docs HTTP server instance.
 *
 * @type {import("node:http").Server}
 */
const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    sendJson(res, 500, { error: error.message });
  });
});

server.listen(port, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Plan wiki docs: http://localhost:${actualPort}`);
  console.log(`Plan wiki source root: ${wikiRoot}`);
  console.log("Feedback inbox: feedback/inbox/*.json");
});
