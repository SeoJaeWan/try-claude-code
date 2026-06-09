#!/usr/bin/env node

// dev-review 서버 — Claude 측, 플러그인 내부, 멀티 리뷰 (스키마 v2).
//
// 모든 task 리뷰를 /review/{key}/ 하위에 동시에 호스팅한다. `key` 는
// `plans/` 아래의 상대 경로이며, 중첩 plan 도 그대로 `/review/foo/bar/`
// 로 매핑된다. v1 의 전체 blob feedback POST 를 대체하기 위해 세분화된
// 엔드포인트를 제공한다: 코멘트는 개별 CRUD, commit_status 는 토글,
// submit 은 별도 호출.

import { createServer } from "node:http";
import { readFile, rename, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMMENT_TYPE,
  COMMENT_TYPE_LIST_TEXT,
  COMMENT_TYPE_VALUES,
} from "./lib/comment-types.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlRoot = path.resolve(__dirname, "..", "assets");
const argv = process.argv.slice(2);

if (argv.includes("--help") || argv.includes("-h")) {
  console.log("Usage: node plugin/develop/skills/dev-review/scripts/server.mjs [--plans-root <path>] [--port 9797]");
  console.log("");
  console.log("  --plans-root  defaults to ${cwd}/plans. The server walks this tree on each");
  console.log("                request and discovers every directory containing");
  console.log("                dev-review/review-data.json — nested plans included.");
  console.log("  --port        default 9797.");
  console.log("");
  console.log("Open http://localhost:{port}/ to pick a discovered review. Direct links use");
  console.log("the review's path under plans-root, e.g. /review/parent/child/.");
  console.log("Multiple Claude sessions may share one server: the second session's");
  console.log("health-check will find this process and reuse it.");
  process.exit(0);
}

/**
 * argv 에서 `--flag value` 형태의 값을 꺼낸다. 플래그가 없거나 다음 토큰이
 * 또 다른 플래그라면 null 을 반환한다.
 *
 * @param {string} name - 찾을 플래그명(예: "--port").
 * @returns {string|null} 플래그 값 또는 null.
 */
function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

const plansRootArg = takeFlag("--plans-root");
const plansRoot = plansRootArg
  ? path.resolve(process.cwd(), plansRootArg)
  : path.resolve(process.cwd(), "plans");
const portArg = takeFlag("--port");
const requestedPort = portArg !== null ? Number(portArg) : 9797;
const port = Number.isFinite(requestedPort) ? requestedPort : 9797;

const SHA_RE = /^[a-f0-9]{40}$/;
const COMMENT_ID_RE = /^cm_\d+$/;
const VALID_SIDES = new Set(["new", "old"]);
const REVIEW_DISCOVERY_MAX_DEPTH = 6;

// 리뷰는 lookup 이 필요한 매 요청마다 plans 트리를 워크하여 발견한다.
// 워크 비용은 작고(파일시스템 stat + 디렉터리 열거, 트리 깊이는 보통 < 100),
// 캐시를 두지 않음으로써 세션 중간에 생성된 리뷰가 즉시 노출된다.
//
// 키 형태: `plansRoot` 로부터 `dev-review/review-data.json` 을 담은 디렉터리
// 까지의 POSIX 상대 경로. `plans/A/B/dev-review/review-data.json` 의 경우
// 키는 `A/B` 다. URL 은 이 키를 그대로 사용한다 — `/review/A/B/...` — 슬래시가
// 그대로 URL 세그먼트 체인이 된다.
//
// 검증은 화이트리스트 방식: 요청의 키가 발견된 집합에 있을 때만 유효하다.
// 워커가 `plansRoot` 내부 경로만 emit 하므로 SLUG_RE/traversal 가드/
// startsWith 체크가 필요 없다.

/**
 * plansRoot 트리를 워크해 dev-review/review-data.json 을 가진 디렉터리
 * 들을 찾는다. 키(POSIX 상대 경로) → 리뷰 메타데이터의 Map 을 반환한다.
 *
 * @returns {Map<string, {key: string, dataRoot: string, reviewDataPath: string, mtimeMs: number}>}
 */
function discoverReviews() {
  const root = path.resolve(plansRoot);
  if (!existsSync(root)) return new Map();
  const out = new Map();
  walkForReviews(root, root, 0, out);
  return out;
}

/**
 * 재귀적으로 디렉터리를 탐색해 리뷰를 발견하면 `out` Map 에 등록한다.
 * 최대 깊이를 초과하면 종료한다. 등록된 디렉터리의 하위 트리는 더 이상
 * 탐색하지 않는다(다른 리뷰의 부모가 될 수 없음).
 *
 * @param {string} root - 트리의 루트(키 계산용).
 * @param {string} dir - 현재 탐색 중인 디렉터리.
 * @param {number} depth - 현재 깊이.
 * @param {Map} out - 결과를 누적할 Map.
 */
function walkForReviews(root, dir, depth, out) {
  if (depth > REVIEW_DISCOVERY_MAX_DEPTH) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  // 이 디렉터리 자체에 `dev-review/review-data.json` 이 있으면 등록한다.
  const reviewDataPath = path.join(dir, "dev-review", "review-data.json");
  if (existsSync(reviewDataPath)) {
    const rel = path.relative(root, dir).split(path.sep).join("/");
    if (rel) {
      let mtimeMs = 0;
      try { mtimeMs = statSync(reviewDataPath).mtimeMs; } catch { /* 무시 */ }
      out.set(rel, {
        key: rel,
        dataRoot: path.dirname(reviewDataPath),
        reviewDataPath,
        mtimeMs,
      });
    }
    // 등록된 리뷰 하위로는 재귀하지 않는다 — 그 `dev-review/` 서브트리는
    // 다른 중첩 plan 의 부모가 될 수 없다.
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "dev-review") continue; // 절대 다른 리뷰의 부모일 수 없음
    if (entry.name.startsWith(".")) continue;
    walkForReviews(root, path.join(dir, entry.name), depth + 1, out);
  }
}

/**
 * 특정 키에 대응하는 리뷰를 조회한다. 매번 디스크를 워크하므로 항상
 * 최신 상태를 반영한다.
 *
 * @param {string} key - 조회할 리뷰 키.
 * @returns {object|null} 리뷰 메타데이터 또는 null.
 */
function resolveReview(key) {
  if (typeof key !== "string" || key.length === 0) return null;
  const reviews = discoverReviews();
  return reviews.get(key) ?? null;
}

/**
 * `/review/{key}/{tail}` 형태의 pathname 을 분해한다. 가장 긴 일치 키를
 * 우선으로 매칭하므로 중첩 키도 올바르게 해석된다. 매칭되는 발견된 키가
 * 없으면(예: 삭제된 리뷰의 stale URL) null 을 반환한다.
 *
 * @param {string} pathname - URL pathname.
 * @returns {{key: string, tail: string, review: object}|null}
 */
function parseReviewPath(pathname) {
  if (!pathname.startsWith("/review/")) return null;
  const rest = pathname.slice("/review/".length);
  if (!rest) return null;
  const reviews = discoverReviews();
  const segs = rest.split("/");
  for (let n = segs.length; n >= 1; n--) {
    const candidate = segs.slice(0, n).join("/");
    if (reviews.has(candidate)) {
      const tail = segs.slice(n).join("/");
      return { key: candidate, tail, review: reviews.get(candidate) };
    }
  }
  return null;
}

/**
 * JSON 응답을 보낸다. content-length 를 명시해 keep-alive 와 호환되게 한다.
 *
 * @param {import("node:http").ServerResponse} res
 * @param {number} status - HTTP 상태 코드.
 * @param {*} value - JSON 직렬화 가능한 값.
 */
function sendJson(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * 일반 텍스트 응답을 보낸다.
 *
 * @param {import("node:http").ServerResponse} res
 * @param {number} status
 * @param {string} value
 */
function sendText(res, status, value) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(value);
}

/**
 * HTML 응답을 보낸다.
 *
 * @param {import("node:http").ServerResponse} res
 * @param {number} status
 * @param {string} value
 */
function sendHtml(res, status, value) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(value);
}

/**
 * 파일 확장자로부터 Content-Type 을 결정한다. 알려지지 않은 확장자는
 * application/octet-stream 으로 반환한다.
 *
 * @param {string} filePath - 정적 파일 경로.
 * @returns {string} Content-Type 문자열.
 */
function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".diff": "text/plain; charset=utf-8",
  }[ext] || "application/octet-stream";
}

/**
 * HTTP 요청 본문을 utf-8 문자열로 읽는다. 1MB 를 초과하면 예외를 던진다
 * (코멘트 페이로드는 매우 작으므로 충분한 상한선).
 *
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<string>} 본문 문자열.
 */
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error("request body too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * JSON 파일을 비동기로 읽어 파싱한다. 파일이 없거나 파싱 실패 시 fallback
 * 을 반환한다.
 *
 * @param {string} filePath
 * @param {*} fallback - 실패 시 반환할 값.
 * @returns {Promise<*>}
 */
async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * JSON 값을 임시 파일에 쓴 뒤 rename 으로 원자적으로 교체한다(비동기).
 * 부모 디렉터리가 없으면 자동 생성한다.
 *
 * @param {string} filePath
 * @param {*} value
 */
async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
}

/**
 * 정적 파일을 스트리밍해서 응답한다. 디렉터리이거나 stat 에 실패하면 404.
 *
 * @param {import("node:http").ServerResponse} res
 * @param {string} filePath
 */
async function sendFile(res, filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return sendText(res, 404, "Not found");
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, "Not found");
  }
}

/**
 * 발견된 모든 리뷰를 최신순(mtimeMs 내림차순)으로 정렬해 배열로 반환한다.
 * 현재 활성 리뷰일 가능성이 가장 높은 항목이 최상단에 오도록 한다.
 *
 * @returns {Array<object>}
 */
function listDiscoveredReviews() {
  const reviews = Array.from(discoverReviews().values());
  reviews.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return reviews;
}

/**
 * picker UI 에 표시할 사람이 읽기 좋은 메타데이터를 review-data.json 에서
 * 일부 발췌해 반환한다. 파일이 수십 KB 수준이고 인덱스 페이지는 단일 응답
 * 사이클에서 렌더링되므로 동기 I/O 로 처리한다.
 *
 * @param {object} review - listDiscoveredReviews 항목.
 * @returns {{key: string, plan_slug: string|null, task_head_sha: string|null, mtimeMs: number}}
 */
function summarizeReview(review) {
  let model = null;
  try {
    model = JSON.parse(readFileSync(review.reviewDataPath, "utf8"));
  } catch {
    /* malformed or mid-write — picker still shows the row, just without metadata */
  }
  return {
    key: review.key,
    plan_slug: model?.plan_slug ?? null,
    task_head_sha: typeof model?.task_head_sha === "string"
      ? model.task_head_sha.slice(0, 7)
      : null,
    mtimeMs: review.mtimeMs,
  };
}

/**
 * `/api/health` 핸들러. 서버가 살아있다는 사실과 발견된 리뷰 목록을 반환해
 * 두 번째 Claude 세션이 같은 서버를 재사용할지 결정할 수 있게 한다.
 *
 * @param {import("node:http").ServerResponse} res
 */
async function handleServerHealth(res) {
  const reviews = listDiscoveredReviews().map(summarizeReview);
  return sendJson(res, 200, {
    ok: true,
    kind: "dev-review",
    schema_version: 2,
    plans_root: plansRoot,
    html_root: htmlRoot,
    available_reviews: reviews,
  });
}

/**
 * `/` 인덱스 핸들러. 발견된 리뷰들을 표 형태로 렌더링해 사용자가
 * 진입할 리뷰를 고를 수 있게 한다.
 *
 * @param {import("node:http").ServerResponse} res
 */
async function handleIndexListing(res) {
  const reviews = listDiscoveredReviews().map(summarizeReview);
  return sendHtml(res, 200, renderPicker(reviews));
}

/**
 * 사용자 입력 또는 디스크에서 읽은 문자열을 HTML 에 안전하게 삽입할 수
 * 있도록 이스케이프한다.
 *
 * @param {*} s - 이스케이프할 값(null/undefined 도 허용).
 * @returns {string}
 */
function htmlEscape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 리뷰 키를 URL 에 안전하게 삽입하기 위해 각 경로 세그먼트를 인코딩한다.
 * 슬래시는 URL 자체의 구분자이므로 보존한다.
 *
 * @param {string} key - 리뷰 키(예: "auth/login").
 * @returns {string} 인코딩된 키.
 */
function urlEncodeKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

/**
 * picker(인덱스) 페이지의 전체 HTML 을 렌더링한다.
 *
 * @param {Array<object>} reviews - summarizeReview 결과 배열.
 * @returns {string} 완전한 HTML 문서.
 */
function renderPicker(reviews) {
  const rows = reviews.length === 0
    ? `<tr><td colspan="3" class="empty">No reviews under <code>${htmlEscape(plansRoot)}</code> yet — generate one with the dev-review helper and refresh.</td></tr>`
    : reviews.map((r) => {
        const href = `/review/${urlEncodeKey(r.key)}/`;
        const head = r.task_head_sha ?? "—";
        const when = r.mtimeMs ? new Date(r.mtimeMs).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—";
        return `<tr>
          <td><a href="${htmlEscape(href)}"><code>${htmlEscape(r.key)}</code></a>${r.plan_slug && r.plan_slug !== r.key ? `<div class="sub">plan_slug: <code>${htmlEscape(r.plan_slug)}</code></div>` : ""}</td>
          <td><code>${htmlEscape(head)}</code></td>
          <td class="when">${htmlEscape(when)}</td>
        </tr>`;
      }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>dev-review · pick a review</title>
  <style>
    :root { color-scheme: light dark; }
    body { font: 14px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif; max-width: 960px; margin: 32px auto; padding: 0 16px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .root { color: #666; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(127,127,127,0.2); vertical-align: top; }
    th { font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; }
    a { color: inherit; }
    code { font-family: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace; font-size: 12.5px; }
    .sub { color: #888; font-size: 12px; margin-top: 2px; }
    .when { color: #666; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .empty { color: #888; padding: 32px 12px; text-align: center; }
  </style>
</head>
<body>
  <h1>dev-review</h1>
  <div class="root">Plans root: <code>${htmlEscape(plansRoot)}</code></div>
  <table>
    <thead>
      <tr><th>Review</th><th>HEAD</th><th>Updated</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

let cachedIndexHtml = null;
/**
 * assets/index.html 을 메모리에 한 번만 읽어 캐시한다.
 *
 * @returns {Promise<string>} index.html 본문.
 */
async function readIndexHtml() {
  if (cachedIndexHtml === null) {
    cachedIndexHtml = await readFile(path.join(htmlRoot, "index.html"), "utf8");
  }
  return cachedIndexHtml;
}

/**
 * `/review/{key}/` 페이지 핸들러. index.html 을 가져와 `<base href>` 태그를
 * head 안에 주입한 뒤 반환한다. 브라우저가 `assets/diffs/...`, `api/...`,
 * `review-data.json` 같은 상대 URL 을 이 base 기준으로 해석한다(따라서
 * 끝의 슬래시가 중요).
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {object} review - parseReviewPath 가 반환한 리뷰 메타데이터.
 */
async function handleReviewPage(req, res, review) {
  let html;
  try {
    html = await readIndexHtml();
  } catch {
    return sendText(res, 500, "index.html not readable");
  }
  const baseTag = `<base href="/review/${urlEncodeKey(review.key)}/">`;
  const injected = html.replace(/<head>/i, `<head>\n  ${baseTag}`);
  return sendHtml(res, 200, injected);
}

/**
 * `/review/{key}/{tail}` 의 tail 부분을 안전하게 디스크 경로로 해석한다.
 * vendor 자산은 htmlRoot 하위로, 데이터 파일과 assets/diffs/ 는 review 의
 * dataRoot 하위로 제한한다. traversal 시도(상위 디렉터리 이탈)는 null 을
 * 반환한다.
 *
 * @param {object} review - 리뷰 메타데이터.
 * @param {string} tail - URL 의 review 키 이후 부분.
 * @returns {string|null} 해석된 파일 절대 경로 또는 null.
 */
function resolveStaticForReview(review, tail) {
  if (tail === "" || tail === "index.html") return null;

  if (tail.startsWith("vendor/")) {
    const resolved = path.resolve(htmlRoot, tail);
    if (!resolved.startsWith(`${htmlRoot}${path.sep}`)) return null;
    return resolved;
  }

  const dataPathStaticFiles = ["review-data.json", "feedback.json", "review-history.json", "author-notes.json"];
  if (dataPathStaticFiles.includes(tail)) {
    return path.join(review.dataRoot, tail);
  }
  if (tail.startsWith("assets/diffs/")) {
    const resolved = path.resolve(review.dataRoot, tail);
    if (!resolved.startsWith(`${review.dataRoot}${path.sep}`)) return null;
    return resolved;
  }
  return null;
}

// ---------- feedback.json 헬퍼 ----------

/**
 * dataRoot/feedback.json 을 읽어 객체로 반환한다. 파일이 없으면 null.
 *
 * @param {string} dataRoot
 * @returns {Promise<object|null>}
 */
async function loadFeedback(dataRoot) {
  return readJsonFile(path.join(dataRoot, "feedback.json"), null);
}

/**
 * feedback 객체를 디스크에 저장한다. updated_at 을 현재 시각으로 갱신한다.
 *
 * @param {string} dataRoot
 * @param {object} fb - 저장할 feedback 객체.
 */
async function saveFeedback(dataRoot, fb) {
  fb.updated_at = new Date().toISOString();
  await writeJsonAtomic(path.join(dataRoot, "feedback.json"), fb);
}

/**
 * dataRoot/review-data.json 을 읽어 모델 객체로 반환한다.
 *
 * @param {string} dataRoot
 * @returns {Promise<object|null>}
 */
async function loadModel(dataRoot) {
  return readJsonFile(path.join(dataRoot, "review-data.json"), null);
}

/**
 * feedback 객체에 v2 스키마에서 요구하는 필드가 모두 존재하도록 보강한다.
 * 디스크에 없거나 깨졌더라도 in-place 로 정상 형태를 만들어 반환한다.
 *
 * @param {object|null} fb - 디스크에서 읽은 feedback(없으면 null).
 * @param {object} model - 같은 라운드의 review-data.json 모델.
 * @param {string} slug - 현재 리뷰의 task_slug.
 * @returns {object} 정규화된 feedback 객체.
 */
function ensureFeedbackShape(fb, model, slug) {
  if (!fb) {
    return {
      schema_version: 2,
      task_slug: slug,
      plan_signature: model?.plan_signature ?? null,
      task_head_sha: model?.task_head_sha ?? null,
      review_status: "in_progress",
      updated_at: new Date().toISOString(),
      comments: [],
      commit_status: {},
    };
  }
  if (!Array.isArray(fb.comments)) fb.comments = [];
  if (!fb.commit_status || typeof fb.commit_status !== "object") fb.commit_status = {};
  if (typeof fb.review_status !== "string") fb.review_status = "in_progress";
  return fb;
}

/**
 * 다음 코멘트 ID 를 발급한다. 형태는 `cm_NNN`(3자리 0-pad).
 * 기존 ID 의 최댓값에 +1.
 *
 * @param {object} fb - 현재 feedback 객체.
 * @returns {string} 새 코멘트 ID.
 */
function nextCommentId(fb) {
  let max = 0;
  for (const c of fb.comments) {
    const m = /^cm_(\d+)$/.exec(c.id || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `cm_${String(max + 1).padStart(3, "0")}`;
}

/**
 * feedback 의 task_slug / plan_signature 가 현재 모델과 일치하는지 확인한다.
 * 불일치하면 409 오류를 표현하는 객체를 반환하고, 일치하면 null.
 *
 * @param {object} fb - feedback 객체.
 * @param {object} model - review-data 모델.
 * @param {string} slug - 현재 task_slug.
 * @returns {{error: string, status: number}|null}
 */
function validateAgainstModel(fb, model, slug) {
  if (fb.task_slug && fb.task_slug !== slug) {
    return { error: "task_slug mismatch", status: 409 };
  }
  if (fb.plan_signature && model?.plan_signature && fb.plan_signature !== model.plan_signature) {
    return { error: "plan_signature mismatch — please reload", status: 409 };
  }
  return null;
}

/**
 * 모델에 포함된 모든 커밋 SHA 집합을 반환한다.
 *
 * @param {object} model
 * @returns {Set<string>}
 */
function commitShaSet(model) {
  const set = new Set();
  for (const c of model?.commits ?? []) set.add(c.sha);
  return set;
}

/**
 * 특정 커밋의 files_changed 에 주어진 file 경로가 포함되어 있는지 확인한다.
 *
 * @param {object} model
 * @param {string} sha
 * @param {string} file
 * @returns {boolean}
 */
function fileExistsInCommit(model, sha, file) {
  for (const c of model?.commits ?? []) {
    if (c.sha !== sha) continue;
    return c.files_changed.some((f) => f.path === file);
  }
  return false;
}

/**
 * 주어진 이름이 모델의 available_agents 에 존재하는지 확인한다.
 *
 * @param {object} model
 * @param {string} name
 * @returns {boolean}
 */
function isAvailableAgent(model, name) {
  return (model?.available_agents ?? []).some((a) => a.name === name);
}

// ---------- API ----------

/**
 * `/review/{key}/api/...` 라우팅 핸들러. 엔드포인트별 세부 핸들러로 분기한다.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {object} review - 리뷰 메타데이터.
 * @param {string} endpoint - api/ 이후의 경로(예: "comment", "comment/cm_001").
 */
async function handleReviewApi(req, res, review, endpoint) {
  const { key: slug, dataRoot } = review;

  if (endpoint === "health") {
    const model = await loadModel(dataRoot);
    return sendJson(res, 200, {
      ok: true,
      slug,
      data_root: dataRoot,
      schema_version: model?.schema_version ?? null,
      plan_signature: model?.plan_signature ?? null,
      task_head_sha: model?.task_head_sha ?? null,
    });
  }

  if (endpoint === "review-data" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(dataRoot, "review-data.json"), {}));
  }

  if (endpoint === "feedback" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(dataRoot, "feedback.json"), {}));
  }

  // POST /api/comment — create
  if (endpoint === "comment" && req.method === "POST") {
    return handleCommentCreate(req, res, slug, dataRoot);
  }

  // PATCH /api/comment/{id} or DELETE /api/comment/{id}
  if (endpoint.startsWith("comment/")) {
    const id = endpoint.slice("comment/".length);
    if (!COMMENT_ID_RE.test(id)) {
      return sendJson(res, 400, { error: "invalid comment id" });
    }
    if (req.method === "PATCH") return handleCommentPatch(req, res, slug, dataRoot, id);
    if (req.method === "DELETE") return handleCommentDelete(req, res, slug, dataRoot, id);
    return sendJson(res, 405, { error: "method not allowed" });
  }

  // POST /api/commit-status — toggle viewed / out_of_scope
  if (endpoint === "commit-status" && req.method === "POST") {
    return handleCommitStatus(req, res, slug, dataRoot);
  }

  // POST /api/submit — finalize
  if (endpoint === "submit" && req.method === "POST") {
    return handleSubmit(req, res, slug, dataRoot);
  }

  // POST /api/reopen — unlock a submitted review for further editing
  if (endpoint === "reopen" && req.method === "POST") {
    return handleReopen(req, res, slug, dataRoot);
  }

  return sendJson(res, 404, { error: "not found" });
}

/**
 * POST /api/comment — 새 코멘트를 생성한다. 입력 검증과 round 무결성을 모두
 * 통과해야 저장된다. needs-change 타입은 valid dispatch_agent 가 필수.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} slug - task_slug.
 * @param {string} dataRoot - 리뷰 데이터 루트.
 */
async function handleCommentCreate(req, res, slug, dataRoot) {
  try {
    const body = JSON.parse(await readBody(req));
    const model = await loadModel(dataRoot);
    if (!model) return sendJson(res, 404, { error: "review-data.json not found" });

    let fb = await loadFeedback(dataRoot);
    fb = ensureFeedbackShape(fb, model, slug);
    if (fb.review_status === "submitted") {
      return sendJson(res, 409, { error: "review already submitted" });
    }

    const v = validateAgainstModel(fb, model, slug);
    if (v) return sendJson(res, v.status, v);

    const err = validateCommentInput(body, model);
    if (err) return sendJson(res, 400, { error: err });

    const now = new Date().toISOString();
    const comment = {
      id: nextCommentId(fb),
      commit_sha: body.commit_sha,
      file: body.file,
      side: body.side,
      line_start: body.line_start,
      line_end: body.line_end,
      type: body.type,
      body: body.body ?? "",
      dispatch_agent: body.type === COMMENT_TYPE.NEEDS_CHANGE ? body.dispatch_agent : null,
      created_at: now,
      updated_at: now,
    };
    fb.comments.push(comment);
    await saveFeedback(dataRoot, fb);
    return sendJson(res, 200, { ok: true, comment });
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}

/**
 * PATCH /api/comment/{id} — 기존 코멘트를 부분 갱신한다. body/type/
 * dispatch_agent 만 갱신 가능하며, needs-change 로 바뀌면 dispatch_agent 가
 * 다시 검증된다.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} slug
 * @param {string} dataRoot
 * @param {string} id - 갱신 대상 코멘트 ID.
 */
async function handleCommentPatch(req, res, slug, dataRoot, id) {
  try {
    const body = JSON.parse(await readBody(req));
    const model = await loadModel(dataRoot);
    if (!model) return sendJson(res, 404, { error: "review-data.json not found" });

    let fb = await loadFeedback(dataRoot);
    fb = ensureFeedbackShape(fb, model, slug);
    if (fb.review_status === "submitted") {
      return sendJson(res, 409, { error: "review already submitted" });
    }

    const idx = fb.comments.findIndex((c) => c.id === id);
    if (idx < 0) return sendJson(res, 404, { error: "comment not found" });

    const current = fb.comments[idx];
    const next = { ...current };
    if (typeof body.body === "string") next.body = body.body;
    if (typeof body.type === "string") {
      if (!COMMENT_TYPE_VALUES.has(body.type)) return sendJson(res, 400, { error: "invalid type" });
      next.type = body.type;
    }
    if (Object.prototype.hasOwnProperty.call(body, "dispatch_agent")) {
      next.dispatch_agent = body.dispatch_agent;
    }

    if (next.type === COMMENT_TYPE.NEEDS_CHANGE) {
      if (!next.dispatch_agent || !isAvailableAgent(model, next.dispatch_agent)) {
        return sendJson(res, 400, { error: "needs-change requires a valid dispatch_agent" });
      }
    } else {
      next.dispatch_agent = null;
    }

    next.updated_at = new Date().toISOString();
    fb.comments[idx] = next;
    await saveFeedback(dataRoot, fb);
    return sendJson(res, 200, { ok: true, comment: next });
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}

/**
 * DELETE /api/comment/{id} — 해당 ID 의 코멘트를 제거한다. submitted 상태
 * 에서는 거부된다.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} slug
 * @param {string} dataRoot
 * @param {string} id
 */
async function handleCommentDelete(req, res, slug, dataRoot, id) {
  const model = await loadModel(dataRoot);
  if (!model) return sendJson(res, 404, { error: "review-data.json not found" });
  let fb = await loadFeedback(dataRoot);
  fb = ensureFeedbackShape(fb, model, slug);
  if (fb.review_status === "submitted") {
    return sendJson(res, 409, { error: "review already submitted" });
  }
  const before = fb.comments.length;
  fb.comments = fb.comments.filter((c) => c.id !== id);
  if (fb.comments.length === before) {
    return sendJson(res, 404, { error: "comment not found" });
  }
  await saveFeedback(dataRoot, fb);
  return sendJson(res, 200, { ok: true });
}

/**
 * POST /api/commit-status — 특정 커밋에 대한 viewed/out_of_scope 플래그를
 * 토글한다. SHA 가 round 내에 존재해야 하며, submitted 상태에서는 거부.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} slug
 * @param {string} dataRoot
 */
async function handleCommitStatus(req, res, slug, dataRoot) {
  try {
    const body = JSON.parse(await readBody(req));
    const model = await loadModel(dataRoot);
    if (!model) return sendJson(res, 404, { error: "review-data.json not found" });

    let fb = await loadFeedback(dataRoot);
    fb = ensureFeedbackShape(fb, model, slug);
    if (fb.review_status === "submitted") {
      return sendJson(res, 409, { error: "review already submitted" });
    }

    const sha = body.commit_sha;
    if (!SHA_RE.test(sha)) return sendJson(res, 400, { error: "invalid commit_sha" });
    if (!commitShaSet(model).has(sha)) {
      return sendJson(res, 400, { error: "commit_sha not in this round" });
    }
    const current = fb.commit_status[sha] || { viewed: false, out_of_scope: false };
    const next = { ...current };
    if (typeof body.viewed === "boolean") next.viewed = body.viewed;
    if (typeof body.out_of_scope === "boolean") next.out_of_scope = body.out_of_scope;
    fb.commit_status[sha] = next;
    await saveFeedback(dataRoot, fb);
    return sendJson(res, 200, { ok: true, commit_status: next });
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}

/**
 * POST /api/submit — 리뷰를 확정(`review_status = "submitted"`)한다.
 * 서버 측 가드: 모든 needs-change 코멘트는 valid dispatch_agent 를 가져야 한다.
 * 위반 시 400 과 함께 offending_comment_ids 를 반환한다.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} slug
 * @param {string} dataRoot
 */
async function handleSubmit(req, res, slug, dataRoot) {
  const model = await loadModel(dataRoot);
  if (!model) return sendJson(res, 404, { error: "review-data.json not found" });

  let fb = await loadFeedback(dataRoot);
  fb = ensureFeedbackShape(fb, model, slug);

  // 서버 측 가드: 모든 needs-change 코멘트는 valid dispatch_agent 가 있어야 한다.
  const offenders = fb.comments.filter(
    (c) => c.type === COMMENT_TYPE.NEEDS_CHANGE && !isAvailableAgent(model, c.dispatch_agent),
  );
  if (offenders.length > 0) {
    return sendJson(res, 400, {
      error: "needs-change comments must have a valid dispatch_agent",
      offending_comment_ids: offenders.map((c) => c.id),
    });
  }

  fb.review_status = "submitted";
  await saveFeedback(dataRoot, fb);
  return sendJson(res, 200, { ok: true, review_status: "submitted" });
}

/**
 * POST /api/reopen — submitted 상태의 리뷰를 다시 편집 가능하게 되돌린다
 * (`review_status = "in_progress"`). history 는 건드리지 않는다 — 서버는
 * review-history.json 의 소유자가 아니다. 이 엔드포인트는 "실수로 제출했고
 * `리뷰 완료`를 말하기 전에 더 고치고 싶다" 는 수동 탈출구다. 라운드를
 * history 로 굳히고 fresh 라운드를 여는 정식 close+reopen 은 `리뷰 완료`
 * 재진입 시 skill 이 수행한다.
 *
 * 이미 in_progress 라면 멱등적으로 ok 를 반환한다.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} slug
 * @param {string} dataRoot
 */
async function handleReopen(req, res, slug, dataRoot) {
  const model = await loadModel(dataRoot);
  if (!model) return sendJson(res, 404, { error: "review-data.json not found" });

  let fb = await loadFeedback(dataRoot);
  fb = ensureFeedbackShape(fb, model, slug);

  fb.review_status = "in_progress";
  await saveFeedback(dataRoot, fb);
  return sendJson(res, 200, { ok: true, review_status: "in_progress" });
}

/**
 * 코멘트 생성 입력의 형식·범위·라운드 무결성을 검증한다. 통과하면 null,
 * 위반 시 사람 읽기 좋은 에러 메시지를 반환한다.
 *
 * @param {object} body - 요청 본문(JSON 객체).
 * @param {object} model - 같은 라운드의 review-data 모델.
 * @returns {string|null}
 */
function validateCommentInput(body, model) {
  if (!body || typeof body !== "object") return "body must be an object";
  if (!SHA_RE.test(body.commit_sha)) return "invalid commit_sha";
  if (!commitShaSet(model).has(body.commit_sha)) return "commit_sha not in this round";
  if (typeof body.file !== "string" || !body.file) return "file required";
  if (!fileExistsInCommit(model, body.commit_sha, body.file)) {
    return "file not in this commit's files_changed";
  }
  if (!VALID_SIDES.has(body.side)) return "side must be 'new' or 'old'";
  if (!Number.isInteger(body.line_start) || body.line_start < 1) return "invalid line_start";
  if (!Number.isInteger(body.line_end) || body.line_end < body.line_start) return "invalid line_end";
  if (!COMMENT_TYPE_VALUES.has(body.type)) return `type must be ${COMMENT_TYPE_LIST_TEXT}`;
  if (body.type === COMMENT_TYPE.NEEDS_CHANGE) {
    if (!body.dispatch_agent || !isAvailableAgent(model, body.dispatch_agent)) {
      return "needs-change requires a valid dispatch_agent";
    }
  }
  if (body.body !== undefined && typeof body.body !== "string") return "body must be a string";
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");

    if (pathname === "/api/health") {
      return handleServerHealth(res);
    }

    if (pathname === "/" || pathname === "/review" || pathname === "/review/") {
      return handleIndexListing(res);
    }

    const parsed = parseReviewPath(pathname);
    if (!parsed) {
      // 발견된 리뷰가 이 URL 과 매칭되지 않는다 — 단순 404 대신 picker 로
      // 돌려보내 stale 링크 상황에서 사용자를 돕는다.
      return sendText(res, 404, `No review matches "${pathname}". See http://localhost:${port}/ for available reviews.`);
    }

    if (parsed.tail === "" || parsed.tail === "/") {
      return handleReviewPage(req, res, parsed.review);
    }

    if (parsed.tail.startsWith("api/")) {
      return handleReviewApi(req, res, parsed.review, parsed.tail.slice("api/".length));
    }

    const filePath = resolveStaticForReview(parsed.review, parsed.tail);
    if (!filePath) return sendText(res, 404, "Not found");
    return sendFile(res, filePath);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`dev-review server (multi-review, schema v2): http://localhost:${actualPort}`);
  console.log(`Plans root: ${plansRoot}`);
  console.log(`HTML root:  ${htmlRoot}`);
  console.log(`Open http://localhost:${actualPort}/ to pick a review.`);
  console.log("When a review is submitted, tell Claude: 리뷰 완료");
});

let shuttingDown = false;
/**
 * SIGINT/SIGTERM 시그널에 응답해 서버를 우아하게 종료한다. 5초 안에 close
 * 콜백이 발생하지 않으면 강제로 exit(0) 한다.
 *
 * @param {string} signal - 수신한 시그널 이름.
 */
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received, shutting down dev-review server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref?.();
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  console.error("[dev-review] unhandledRejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("[dev-review] uncaughtException:", err);
});
