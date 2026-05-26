#!/usr/bin/env node

/**
 * 계획 developer review UI를 제공하는 로컬 HTTP 서버.
 *
 * `plans/{task-slug}/developer-review` 아래의 review package를 읽고,
 * 브라우저에서 feedback/comment/approval 상태를 편집할 수 있는 API와 정적 asset 라우트를 제공한다.
 */

import { createServer } from "node:http";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const plansRoot = path.join(repoRoot, "plans");
const sharedIndexPath = path.join(
  repoRoot,
  ".codex",
  "skills",
  "orchestrator",
  "assets",
  "developer-review",
  "index.html"
);
const argv = process.argv.slice(2);

if (argv.includes("--help") || argv.includes("-h")) {
  console.log("Usage: node .codex/tools/plan-review-browser-server.mjs [review-dir] [--port 8787]");
  console.log("");
  console.log("Open reviews at /review/{task-slug}.");
  console.log("When [review-dir] is passed, / redirects to the matching /review/{task-slug} URL.");
  process.exit(0);
}

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

/**
 * flag가 아닌 위치 인자를 추출한다.
 *
 * legacy review directory를 받는 이전 호출 방식을 지원하기 위한 함수다.
 *
 * @returns {string[]} CLI 위치 인자 목록.
 */
function positionalArgs() {
  const values = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--port") {
      i += 1;
      continue;
    }
    if (!arg.startsWith("--")) {
      values.push(arg);
    }
  }
  return values;
}

const legacyReviewRootArg = positionalArgs()[0];
const legacyReviewRoot = legacyReviewRootArg ? path.resolve(process.cwd(), legacyReviewRootArg) : null;
const portArg = takeFlag("--port");
const requestedPort = portArg !== null ? Number(portArg) : 8787;
const port = Number.isFinite(requestedPort) ? requestedPort : 8787;

/**
 * JSON 응답을 UTF-8 본문으로 보낸다.
 *
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {number} status HTTP status code.
 * @param {unknown} value JSON으로 직렬화할 값.
 * @returns {void}
 */
function sendJson(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
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
    ".html": "text/html; charset=utf-8",
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
 * HTTP 요청 본문을 문자열로 읽고 크기를 제한한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @returns {Promise<string>} UTF-8 요청 본문.
 * @throws {Error} 본문이 1MiB를 넘는 경우.
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
 * JSON 파일을 읽고 실패하면 fallback을 반환한다.
 *
 * @template T
 * @param {string} filePath 읽을 JSON 파일 경로.
 * @param {T} fallback 파일이 없거나 파싱 실패 시 반환할 값.
 * @returns {Promise<T | unknown>} 파싱된 JSON 값 또는 fallback.
 */
async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * legacy feedback schema에서 허용하는 item status 값 목록.
 *
 * @type {Set<string>}
 */
const VALID_FEEDBACK_STATUSES = new Set(["", "approved", "needs-change", "question", "out-of-scope"]);
/**
 * v2 comment가 표현할 수 있는 검토 의견 유형.
 *
 * @type {Set<string>}
 */
const COMMENT_TYPES = new Set(["needs-change", "question", "out-of-scope"]);
/**
 * review comment id의 안전한 형식.
 *
 * @type {RegExp}
 */
const COMMENT_ID_RE = /^cm_\d+$/;

/**
 * 값이 배열이면 그대로, 단일 값이면 1개짜리 배열, 빈 값이면 빈 배열로 변환한다.
 *
 * @param {unknown} value 배열화할 값.
 * @returns {unknown[]} 정규화된 배열.
 */
function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * signature 계산에서 순서와 volatile field 영향을 제거한 payload를 만든다.
 *
 * @param {unknown} value 정규화할 값.
 * @returns {unknown} key 순서가 안정화된 값.
 */
function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const ignored = new Set(["review_item_signature", "signature"]);
    return Object.keys(value)
      .filter((key) => !ignored.has(key) && value[key] !== undefined)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value ?? null;
}

/**
 * review item signature에 사용할 짧은 non-cryptographic hash를 만든다.
 *
 * @param {string} value hash 입력 문자열.
 * @returns {string} `rvw-` prefix가 붙은 signature.
 */
function hashString(value) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `rvw-${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * review item payload에서 현재 signature를 계산한다.
 *
 * @param {unknown} payload signature 입력 payload.
 * @returns {string} review item signature.
 */
function reviewItemSignatureFromPayload(payload) {
  return hashString(JSON.stringify(canonicalize(payload)));
}

/**
 * 개별 phase/card signature에 공통으로 들어갈 plan-level context를 추출한다.
 *
 * @param {object | null | undefined} model review-data model.
 * @returns {object} signature용 전역 context.
 */
function reviewGlobalContext(model) {
  const overview = model?.overview || {};
  return {
    task_slug: model?.task_slug || "",
    generator_contract_version: model?.generator_contract_version || 0,
    title: model?.title || "",
    review_outcome: model?.review_outcome || "",
    review_findings: asArray(model?.review_findings),
    overview_scope: {
      user_request: asArray(overview.user_request),
      included_scope: asArray(overview.included_scope),
      excluded_scope: asArray(overview.excluded_scope),
      change_shape: overview.change_shape || "",
      change_flow: asArray(overview.change_flow),
      major_changes: asArray(overview.major_changes),
      topology_contract: asArray(model?.topology_contract),
      evidence_artifacts: asArray(model?.evidence_artifacts)
    }
  };
}

/**
 * overview item의 signature payload를 만든다.
 *
 * @param {object | null | undefined} model review-data model.
 * @returns {object} overview signature payload.
 */
function overviewSignaturePayload(model) {
  const overview = model?.overview || {};
  return {
    kind: "overview",
    id: "overview",
    generator_contract_version: model?.generator_contract_version || 0,
    title: model?.title || "",
    review_outcome: model?.review_outcome || "",
    review_findings: asArray(model?.review_findings),
    overview: {
      user_request: asArray(overview.user_request),
      understanding: overview.understanding || "",
      included_scope: asArray(overview.included_scope),
      excluded_scope: asArray(overview.excluded_scope),
      change_shape: overview.change_shape || "",
      change_flow: asArray(overview.change_flow),
      major_changes: asArray(overview.major_changes),
      risks: asArray(overview.risks),
      ui_previews: asArray(overview.ui_previews),
      topology_contract: asArray(overview.topology_contract),
      evidence_artifacts: asArray(overview.evidence_artifacts)
    }
  };
}

/**
 * phase item의 signature payload를 만든다.
 *
 * @param {object | null | undefined} model review-data model.
 * @param {object | null | undefined} phase phase 데이터.
 * @param {number} index phase 배열 index.
 * @returns {object} phase signature payload.
 */
function phaseSignaturePayload(model, phase, index) {
  return {
    kind: "phase",
    id: phase?.id || `P${index + 1}`,
    global_context: reviewGlobalContext(model),
    phase: {
      id: phase?.id || `P${index + 1}`,
      title: phase?.title || "",
      owner_agent: phase?.owner_agent || "",
      goal: phase?.goal || "",
      changes: asArray(phase?.changes),
      contracts: asArray(phase?.contracts),
      file_impacts: asArray(phase?.file_impacts),
      validation: asArray(phase?.validation),
      risks: asArray(phase?.risks),
      ui_previews: asArray(phase?.ui_previews),
      topology_contract: asArray(phase?.topology_contract),
      evidence_artifacts: asArray(phase?.evidence_artifacts)
    }
  };
}

/**
 * card item의 signature payload를 만든다.
 *
 * @param {object | null | undefined} model review-data model.
 * @param {object | null | undefined} card card 데이터.
 * @param {number} index card 배열 index.
 * @returns {object} card signature payload.
 */
function cardSignaturePayload(model, card, index) {
  return {
    kind: "card",
    id: card?.id || `C${index + 1}`,
    global_context: reviewGlobalContext(model),
    card
  };
}

/**
 * item에 저장된 signature가 있으면 재사용하고 없으면 fallback payload로 계산한다.
 *
 * @param {object | null | undefined} item review item.
 * @param {unknown} fallbackPayload 저장 signature가 없을 때 사용할 payload.
 * @returns {string} review item signature.
 */
function itemSignature(item, fallbackPayload) {
  return item?.review_item_signature || item?.signature || reviewItemSignatureFromPayload(fallbackPayload);
}

/**
 * 현재 review-data model에 포함된 모든 승인 대상 item의 signature map을 만든다.
 *
 * @param {object | null | undefined} model review-data model.
 * @returns {Map<string, string>} item id와 signature의 map.
 */
function currentReviewItemSignatures(model) {
  const result = new Map();
  if (Array.isArray(model?.review_items) && model.review_items.length) {
    for (const item of model.review_items) {
      if (!item || typeof item !== "object" || !item.id) continue;
      result.set(item.id, itemSignature(item, item));
    }
    return result;
  }
  result.set("overview", itemSignature(model?.overview || {}, overviewSignaturePayload(model)));
  asArray(model?.phases).forEach((phase, index) => {
    if (!phase || typeof phase !== "object") return;
    const id = phase.id || `P${index + 1}`;
    result.set(id, itemSignature(phase, phaseSignaturePayload(model, phase, index)));
  });
  asArray(model?.cards).forEach((card, index) => {
    if (!card || typeof card !== "object") return;
    const id = card.id || `C${index + 1}`;
    result.set(id, itemSignature(card, cardSignaturePayload(model, card, index)));
  });
  result.set("final", `final-${model?.plan_signature || ""}`);
  return result;
}

/**
 * legacy feedback collection의 승인 상태가 현재 review-data signature와 맞는지 검증한다.
 *
 * @param {object | null | undefined} collection legacy `steps` 또는 `cards` collection.
 * @param {Map<string, string>} itemSignatures 현재 item signature map.
 * @param {string} label 오류 메시지에 사용할 collection 이름.
 * @param {string} planSignature 현재 plan signature.
 * @returns {string | null} 오류 메시지 또는 정상 시 `null`.
 */
function validateFeedbackCollection(collection, itemSignatures, label, planSignature) {
  if (!collection || typeof collection !== "object") return null;
  for (const [itemId, item] of Object.entries(collection)) {
    if (!item || typeof item !== "object") {
      return `${label}.${itemId} must be an object`;
    }
    const status = typeof item.status === "string" ? item.status : "";
    if (!VALID_FEEDBACK_STATUSES.has(status)) {
      return `${label}.${itemId}.status is invalid`;
    }
    if (status !== "approved") {
      continue;
    }
    const expectedSignature = itemSignatures.get(itemId);
    if (!expectedSignature) {
      return `${label}.${itemId} is not present in current review-data`;
    }
    const approvedAgainst = item.approved_against;
    if (!approvedAgainst || typeof approvedAgainst !== "object") {
      return `${label}.${itemId}.approved_against is required for approved status`;
    }
    if (approvedAgainst.plan_signature !== planSignature) {
      return `${label}.${itemId}.approved_against.plan_signature is stale`;
    }
    if (approvedAgainst.review_item_signature !== expectedSignature) {
      return `${label}.${itemId}.approved_against.review_item_signature is stale`;
    }
  }
  return null;
}

/**
 * feedback schema version에 맞는 검증 함수를 선택한다.
 *
 * @param {object | null | undefined} feedback feedback JSON 값.
 * @param {object | null | undefined} model review-data model.
 * @returns {string | null} 오류 메시지 또는 정상 시 `null`.
 */
function validateFeedbackForModel(feedback, model) {
  if (feedback?.schema_version === 2 || Array.isArray(feedback?.comments) || feedback?.item_status) {
    return validateV2FeedbackForModel(feedback, model);
  }
  if (!feedback.steps || typeof feedback.steps !== "object") {
    return "feedback.steps must be an object";
  }
  const itemSignatures = currentReviewItemSignatures(model);
  return validateFeedbackCollection(feedback.steps, itemSignatures, "steps", model.plan_signature) ||
    validateFeedbackCollection(feedback.cards, itemSignatures, "cards", model.plan_signature);
}

/**
 * v2 feedback이 현재 review-data와 같은 task/signature를 기준으로 하는지 검증한다.
 *
 * @param {object | null | undefined} feedback v2 feedback 객체.
 * @param {object | null | undefined} model review-data model.
 * @returns {string | null} 오류 메시지 또는 정상 시 `null`.
 */
function validateV2FeedbackForModel(feedback, model) {
  if (!Array.isArray(feedback.comments)) {
    return "feedback.comments must be an array";
  }
  if (!feedback.item_status || typeof feedback.item_status !== "object") {
    return "feedback.item_status must be an object";
  }

  const itemSignatures = currentReviewItemSignatures(model);
  for (const comment of feedback.comments) {
    const error = validateCommentShape(comment, model);
    if (error) return error;
  }

  for (const [itemId, status] of Object.entries(feedback.item_status)) {
    if (!itemSignatures.has(itemId)) {
      return `item_status.${itemId} is not present in current review-data`;
    }
    if (!status || typeof status !== "object") {
      return `item_status.${itemId} must be an object`;
    }
    if (status.approved === true) {
      const approvedAgainst = status.approved_against;
      if (!approvedAgainst || typeof approvedAgainst !== "object") {
        return `item_status.${itemId}.approved_against is required for approved item`;
      }
      if (approvedAgainst.plan_signature !== model.plan_signature) {
        return `item_status.${itemId}.approved_against.plan_signature is stale`;
      }
      if (approvedAgainst.review_item_signature !== itemSignatures.get(itemId)) {
        return `item_status.${itemId}.approved_against.review_item_signature is stale`;
      }
    }
  }
  return null;
}

/**
 * 개별 comment의 필수 필드와 target 연결성을 검증한다.
 *
 * @param {object | null | undefined} comment comment 객체.
 * @param {object | null | undefined} model review-data model.
 * @returns {string | null} 오류 메시지 또는 정상 시 `null`.
 */
function validateCommentShape(comment, model) {
  if (!comment || typeof comment !== "object") return "comment must be an object";
  if (typeof comment.id !== "string" || !COMMENT_ID_RE.test(comment.id)) return "comment.id is invalid";
  if (!currentReviewItemSignatures(model).has(comment.target_id)) return "comment.target_id is not present in current review-data";
  if (typeof comment.anchor_id !== "string" || !comment.anchor_id) return "comment.anchor_id is required";
  if (!COMMENT_TYPES.has(comment.type)) return "comment.type is invalid";
  if (comment.body !== undefined && typeof comment.body !== "string") return "comment.body must be a string";
  return null;
}

/**
 * JSON 파일을 임시 파일에 먼저 쓴 뒤 rename으로 원자적으로 교체한다.
 *
 * @param {string} filePath 저장할 JSON 파일 경로.
 * @param {unknown} value 직렬화할 값.
 * @returns {Promise<void>}
 */
async function writeJsonAtomic(filePath, value) {
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
}

/**
 * task slug가 URL/path segment로 안전한 ASCII 값인지 확인한다.
 *
 * @param {unknown} taskSlug 확인할 task slug.
 * @returns {boolean} 안전한 형식이면 `true`.
 */
function isSafeTaskSlug(taskSlug) {
  return typeof taskSlug === "string" && /^[A-Za-z0-9_-]+$/.test(taskSlug);
}

/**
 * task slug에 대응하는 developer-review root를 안전하게 계산한다.
 *
 * @param {string} taskSlug task slug.
 * @returns {string | null} review root 절대 경로, 안전하지 않으면 `null`.
 */
function reviewRootForTask(taskSlug) {
  if (!isSafeTaskSlug(taskSlug)) {
    return null;
  }

  const reviewRoot = path.resolve(plansRoot, taskSlug, "developer-review");
  const plansPrefix = `${path.resolve(plansRoot)}${path.sep}`;
  if (!reviewRoot.startsWith(plansPrefix)) {
    return null;
  }
  return reviewRoot;
}

/**
 * legacy review root 인자가 있을 때 task slug를 역산한다.
 *
 * @returns {string | null} task slug 또는 확인 불가 시 `null`.
 */
function taskSlugFromLegacyRoot() {
  if (!legacyReviewRoot) return null;
  const taskSlug = path.basename(path.dirname(legacyReviewRoot));
  return isSafeTaskSlug(taskSlug) ? taskSlug : null;
}

/**
 * `/api/reviews/{taskSlug}/...` 같은 prefix 기반 경로를 task와 segment로 분해한다.
 *
 * @param {string} pathname URL pathname.
 * @param {string} prefix task slug 앞의 route prefix.
 * @returns {{ taskSlug: string, segments: string[] } | null} 파싱 결과 또는 실패 시 `null`.
 */
function parseTaskPath(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const [taskSlug, ...segments] = rest.split("/").filter(Boolean);
  if (!isSafeTaskSlug(taskSlug)) return null;
  return { taskSlug, segments };
}

/**
 * review asset 요청을 developer-review/assets 하위 실제 파일 경로로 안전하게 해석한다.
 *
 * @param {string} taskSlug task slug.
 * @param {string[]} segments asset path segment 목록.
 * @returns {string | null} 안전한 asset 절대 경로 또는 거부 시 `null`.
 */
function resolveReviewAssetPath(taskSlug, segments) {
  const reviewRoot = reviewRootForTask(taskSlug);
  if (!reviewRoot || !segments.length) {
    return null;
  }

  const assetRoot = path.join(reviewRoot, "assets");
  const resolved = path.resolve(assetRoot, ...segments);
  if (!resolved.startsWith(`${assetRoot}${path.sep}`)) {
    return null;
  }
  return resolved;
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
    createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, "Not found");
  }
}

/**
 * review root의 현재 review-data model을 읽는다.
 *
 * @param {string} reviewRoot developer-review root 경로.
 * @returns {Promise<object | null>} review-data model 또는 없으면 `null`.
 */
async function currentReviewModel(reviewRoot) {
  return readJsonFile(path.join(reviewRoot, "review-data.json"), null);
}

/**
 * feedback.json을 읽고 현재 model 기준 v2 feedback shape로 정규화한다.
 *
 * @param {string} reviewRoot developer-review root 경로.
 * @param {object | null | undefined} model review-data model.
 * @param {string} taskSlug task slug.
 * @returns {Promise<object>} v2 feedback 객체.
 */
async function currentFeedback(reviewRoot, model, taskSlug) {
  const existing = await readJsonFile(path.join(reviewRoot, "feedback.json"), null);
  return ensureV2Feedback(existing, model, taskSlug);
}

/**
 * legacy 또는 불완전한 feedback 값을 v2 feedback 구조로 변환한다.
 *
 * @param {object | null | undefined} feedback 기존 feedback 값.
 * @param {object | null | undefined} model review-data model.
 * @param {string} taskSlug task slug.
 * @returns {object} 현재 plan signature에 맞춘 v2 feedback.
 */
function ensureV2Feedback(feedback, model, taskSlug) {
  if (feedback?.schema_version === 2 || Array.isArray(feedback?.comments) || feedback?.item_status) {
    const sameTask = !feedback.task_slug || feedback.task_slug === taskSlug;
    const samePlan = feedback.plan_signature === model?.plan_signature;
    const next = {
      schema_version: 2,
      task_slug: taskSlug,
      plan_signature: model?.plan_signature || "",
      review_status: sameTask && samePlan && feedback.review_status === "submitted" ? "submitted" : "in_progress",
      updated_at: feedback.updated_at || new Date().toISOString(),
      comments: sameTask && samePlan && Array.isArray(feedback.comments) ? feedback.comments : [],
      item_status: {}
    };
    if (sameTask && samePlan && feedback.item_status && typeof feedback.item_status === "object") {
      for (const [itemId, status] of Object.entries(feedback.item_status)) {
        if (!status || typeof status !== "object") continue;
        next.item_status[itemId] = status.approved
          ? { approved: true, approved_against: status.approved_against }
          : { approved: false };
      }
    }
    ensureItemStatus(next, model);
    return next;
  }

  const next = {
    schema_version: 2,
    task_slug: taskSlug,
    plan_signature: model?.plan_signature || "",
    review_status: "in_progress",
    updated_at: new Date().toISOString(),
    comments: [],
    item_status: {}
  };

  for (const [itemId, signature] of currentReviewItemSignatures(model)) {
    const prior = feedback?.steps?.[itemId];
    if (prior?.status === "approved" && prior?.approved_against?.review_item_signature === signature) {
      next.item_status[itemId] = {
        approved: true,
        approved_against: approvalEvidence(model, itemId, prior.approved_against?.approved_at, prior.approved_against?.carried_from_plan_signature)
      };
    } else {
      next.item_status[itemId] = { approved: false };
    }
  }
  return next;
}

/**
 * 현재 review-data의 모든 item id가 feedback.item_status에 존재하도록 채운다.
 *
 * @param {object} feedback v2 feedback 객체.
 * @param {object | null | undefined} model review-data model.
 * @returns {void}
 */
function ensureItemStatus(feedback, model) {
  for (const itemId of currentReviewItemSignatures(model).keys()) {
    if (!feedback.item_status[itemId] || typeof feedback.item_status[itemId] !== "object") {
      feedback.item_status[itemId] = { approved: false };
    }
  }
}

/**
 * 특정 item 승인 상태를 현재 plan/item signature에 묶는 증거 객체를 만든다.
 *
 * @param {object} model review-data model.
 * @param {string} itemId 승인 대상 item id.
 * @param {string | null} [approvedAt=null] 기존 승인 시각을 유지할 때 사용하는 값.
 * @param {string | null} [carriedFromPlanSignature=null] 이전 plan signature에서 이월된 승인 정보.
 * @returns {object} approval evidence 객체.
 */
function approvalEvidence(model, itemId, approvedAt = null, carriedFromPlanSignature = null) {
  const signature = currentReviewItemSignatures(model).get(itemId);
  return {
    plan_signature: model.plan_signature,
    review_item_signature: signature,
    approved_at: approvedAt || new Date().toISOString(),
    carried_from_plan_signature: carriedFromPlanSignature && carriedFromPlanSignature !== model.plan_signature
      ? carriedFromPlanSignature
      : null
  };
}

/**
 * 현재 feedback 안에서 다음 comment id를 생성한다.
 *
 * @param {object} feedback v2 feedback 객체.
 * @returns {string} `cm_001` 형식의 다음 comment id.
 */
function nextCommentId(feedback) {
  let max = 0;
  for (const comment of feedback.comments || []) {
    const match = /^cm_(\d+)$/.exec(comment.id || "");
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `cm_${String(max + 1).padStart(3, "0")}`;
}

/**
 * 제출 완료된 feedback인지 확인해 편집 가능 여부 오류를 반환한다.
 *
 * @param {object} feedback v2 feedback 객체.
 * @returns {string | null} 편집 불가 메시지 또는 편집 가능 시 `null`.
 */
function assertEditable(feedback) {
  return feedback.review_status === "submitted" ? "review already submitted" : null;
}

/**
 * 특정 item에 active blocking comment가 있는지 확인한다.
 *
 * @param {object} feedback v2 feedback 객체.
 * @param {string} itemId 확인할 item id.
 * @returns {boolean} `needs-change` 또는 `question` comment가 있으면 `true`.
 */
function hasBlockingComments(feedback, itemId) {
  return asArray(feedback.comments).some((comment) =>
    comment.target_id === itemId && (comment.type === "needs-change" || comment.type === "question")
  );
}

/**
 * feedback 객체의 수정 시각을 갱신하고 디스크에 저장한다.
 *
 * @param {string} reviewRoot developer-review root 경로.
 * @param {object} feedback 저장할 feedback 객체.
 * @returns {Promise<void>}
 */
async function saveFeedback(reviewRoot, feedback) {
  feedback.updated_at = new Date().toISOString();
  await writeJsonAtomic(path.join(reviewRoot, "feedback.json"), feedback);
}

/**
 * `/api/**` 요청을 처리한다.
 *
 * health, review-data, history, feedback, comment, item approval, submit endpoint를 라우팅한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} pathname URL pathname.
 * @returns {Promise<void>}
 */
async function handleApi(req, res, pathname) {
  if (pathname === "/api/health") {
    const legacyTaskSlug = taskSlugFromLegacyRoot();
    const legacyModel = legacyReviewRoot ? await currentReviewModel(legacyReviewRoot) : null;
    return sendJson(res, 200, {
      ok: true,
      mode: "multi-review",
      legacy_review_root: legacyReviewRoot,
      legacy_task_slug: legacyTaskSlug,
      legacy_plan_signature: legacyModel?.plan_signature || null
    });
  }

  const match = parseTaskPath(pathname, "/api/reviews/");
  if (!match) {
    return sendJson(res, 404, { error: "not found" });
  }

  const { taskSlug, segments } = match;
  const endpoint = segments.join("/");
  const reviewRoot = reviewRootForTask(taskSlug);
  if (!reviewRoot) {
    return sendJson(res, 400, { error: "invalid task slug" });
  }

  if (endpoint === "health" && req.method === "GET") {
    const model = await currentReviewModel(reviewRoot);
    return sendJson(res, 200, {
      ok: true,
      task_slug: taskSlug,
      review_root: reviewRoot,
      plan_signature: model?.plan_signature || null
    });
  }

  if (endpoint === "review-data" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(reviewRoot, "review-data.json"), {}));
  }

  if (endpoint === "review-history" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(reviewRoot, "review-history.json"), {}));
  }

  if (endpoint === "feedback" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(reviewRoot, "feedback.json"), {}));
  }

  if (endpoint === "comment" && req.method === "POST") {
    return handleCommentCreate(req, res, taskSlug, reviewRoot);
  }

  if (endpoint.startsWith("comment/")) {
    const id = endpoint.slice("comment/".length);
    if (!COMMENT_ID_RE.test(id)) {
      return sendJson(res, 400, { error: "invalid comment id" });
    }
    if (req.method === "PATCH") return handleCommentPatch(req, res, taskSlug, reviewRoot, id);
    if (req.method === "DELETE") return handleCommentDelete(req, res, taskSlug, reviewRoot, id);
    return sendJson(res, 405, { error: "method not allowed" });
  }

  if (endpoint === "item-status" && req.method === "POST") {
    return handleItemStatus(req, res, taskSlug, reviewRoot);
  }

  if (endpoint === "submit" && req.method === "POST") {
    return handleSubmit(req, res, taskSlug, reviewRoot);
  }

  if (endpoint === "feedback" && req.method === "POST") {
    try {
      const feedback = JSON.parse(await readBody(req));
      if (!feedback || typeof feedback !== "object") {
        return sendJson(res, 400, { error: "feedback must be an object" });
      }

      const model = await currentReviewModel(reviewRoot);
      if (!model) {
        return sendJson(res, 404, { error: "review-data.json not found" });
      }
      if (model.task_slug !== taskSlug || feedback.task_slug !== taskSlug) {
        return sendJson(res, 409, { error: "task_slug mismatch" });
      }
      if (feedback.plan_signature !== model.plan_signature) {
        return sendJson(res, 409, { error: "plan_signature mismatch" });
      }

      const validationError = validateFeedbackForModel(feedback, model);
      if (validationError) {
        return sendJson(res, 400, { error: validationError });
      }

      feedback.updated_at = new Date().toISOString();
      await writeJsonAtomic(path.join(reviewRoot, "feedback.json"), feedback);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: "not found" });
}

/**
 * 새 review comment를 생성하고 대상 item의 approval을 해제한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} taskSlug task slug.
 * @param {string} reviewRoot developer-review root 경로.
 * @returns {Promise<void>}
 */
async function handleCommentCreate(req, res, taskSlug, reviewRoot) {
  try {
    const body = JSON.parse(await readBody(req));
    const model = await currentReviewModel(reviewRoot);
    if (!model) return sendJson(res, 404, { error: "review-data.json not found" });
    let feedback = await currentFeedback(reviewRoot, model, taskSlug);
    const editableError = assertEditable(feedback);
    if (editableError) return sendJson(res, 409, { error: editableError });
    const inputError = validateCommentInput(body, model);
    if (inputError) return sendJson(res, 400, { error: inputError });
    const now = new Date().toISOString();
    const comment = {
      id: nextCommentId(feedback),
      target_id: body.target_id,
      anchor_id: body.anchor_id,
      type: body.type,
      body: body.body || "",
      created_at: now,
      updated_at: now
    };
    feedback.comments.push(comment);
    if (comment.type !== "out-of-scope") {
      feedback.item_status[comment.target_id] = {
        ...(feedback.item_status[comment.target_id] || { approved: false }),
        approved: false
      };
      delete feedback.item_status[comment.target_id].approved_against;
    }
    await saveFeedback(reviewRoot, feedback);
    return sendJson(res, 200, { ok: true, comment, feedback });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

/**
 * 기존 review comment의 본문, 유형, anchor를 수정한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} taskSlug task slug.
 * @param {string} reviewRoot developer-review root 경로.
 * @param {string} id 수정할 comment id.
 * @returns {Promise<void>}
 */
async function handleCommentPatch(req, res, taskSlug, reviewRoot, id) {
  try {
    const body = JSON.parse(await readBody(req));
    const model = await currentReviewModel(reviewRoot);
    if (!model) return sendJson(res, 404, { error: "review-data.json not found" });
    const feedback = await currentFeedback(reviewRoot, model, taskSlug);
    const editableError = assertEditable(feedback);
    if (editableError) return sendJson(res, 409, { error: editableError });
    const index = feedback.comments.findIndex((comment) => comment.id === id);
    if (index < 0) return sendJson(res, 404, { error: "comment not found" });
    const next = { ...feedback.comments[index] };
    if (typeof body.body === "string") next.body = body.body;
    if (typeof body.type === "string") next.type = body.type;
    if (typeof body.anchor_id === "string") next.anchor_id = body.anchor_id;
    const inputError = validateCommentInput(next, model, true);
    if (inputError) return sendJson(res, 400, { error: inputError });
    next.updated_at = new Date().toISOString();
    feedback.comments[index] = next;
    if (next.type !== "out-of-scope") {
      feedback.item_status[next.target_id] = {
        ...(feedback.item_status[next.target_id] || { approved: false }),
        approved: false
      };
      delete feedback.item_status[next.target_id].approved_against;
    }
    await saveFeedback(reviewRoot, feedback);
    return sendJson(res, 200, { ok: true, comment: next, feedback });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

/**
 * 기존 review comment를 삭제한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} taskSlug task slug.
 * @param {string} reviewRoot developer-review root 경로.
 * @param {string} id 삭제할 comment id.
 * @returns {Promise<void>}
 */
async function handleCommentDelete(req, res, taskSlug, reviewRoot, id) {
  const model = await currentReviewModel(reviewRoot);
  if (!model) return sendJson(res, 404, { error: "review-data.json not found" });
  const feedback = await currentFeedback(reviewRoot, model, taskSlug);
  const editableError = assertEditable(feedback);
  if (editableError) return sendJson(res, 409, { error: editableError });
  const before = feedback.comments.length;
  feedback.comments = feedback.comments.filter((comment) => comment.id !== id);
  if (feedback.comments.length === before) {
    return sendJson(res, 404, { error: "comment not found" });
  }
  await saveFeedback(reviewRoot, feedback);
  return sendJson(res, 200, { ok: true, feedback });
}

/**
 * 특정 review item의 승인 상태를 변경한다.
 *
 * blocking comment가 남아 있으면 승인 상태로 바꾸지 않는다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} taskSlug task slug.
 * @param {string} reviewRoot developer-review root 경로.
 * @returns {Promise<void>}
 */
async function handleItemStatus(req, res, taskSlug, reviewRoot) {
  try {
    const body = JSON.parse(await readBody(req));
    const model = await currentReviewModel(reviewRoot);
    if (!model) return sendJson(res, 404, { error: "review-data.json not found" });
    const feedback = await currentFeedback(reviewRoot, model, taskSlug);
    const editableError = assertEditable(feedback);
    if (editableError) return sendJson(res, 409, { error: editableError });
    const itemId = body.target_id;
    if (!currentReviewItemSignatures(model).has(itemId)) {
      return sendJson(res, 400, { error: "target_id is not present in current review-data" });
    }
    const current = feedback.item_status[itemId] || { approved: false };
    const next = { ...current };
    if (typeof body.approved === "boolean") {
      if (body.approved && hasBlockingComments(feedback, itemId)) {
        return sendJson(res, 409, { error: "cannot approve target with active needs-change or question comments" });
      }
      next.approved = body.approved;
      if (body.approved) {
        next.approved_against = approvalEvidence(model, itemId, current.approved_against?.approved_at, current.approved_against?.carried_from_plan_signature);
      } else {
        delete next.approved_against;
      }
    }
    feedback.item_status[itemId] = next;
    await saveFeedback(reviewRoot, feedback);
    return sendJson(res, 200, { ok: true, item_status: next, feedback });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

/**
 * 현재 feedback을 검증한 뒤 제출 완료 상태로 전환한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} taskSlug task slug.
 * @param {string} reviewRoot developer-review root 경로.
 * @returns {Promise<void>}
 */
async function handleSubmit(req, res, taskSlug, reviewRoot) {
  const model = await currentReviewModel(reviewRoot);
  if (!model) return sendJson(res, 404, { error: "review-data.json not found" });
  const feedback = await currentFeedback(reviewRoot, model, taskSlug);
  const validationError = validateV2FeedbackForModel(feedback, model);
  if (validationError) return sendJson(res, 400, { error: validationError });
  feedback.review_status = "submitted";
  await saveFeedback(reviewRoot, feedback);
  return sendJson(res, 200, { ok: true, review_status: "submitted", feedback });
}

/**
 * comment 생성/수정 요청의 입력 shape를 검증한다.
 *
 * @param {object | null | undefined} body 요청 JSON body.
 * @param {object | null | undefined} model review-data model.
 * @param {boolean} [allowExistingId=false] 기존 id 검증을 포함할지 여부.
 * @returns {string | null} 오류 메시지 또는 정상 시 `null`.
 */
function validateCommentInput(body, model, allowExistingId = false) {
  if (!body || typeof body !== "object") return "body must be an object";
  if (allowExistingId && (!body.id || !COMMENT_ID_RE.test(body.id))) return "invalid comment id";
  if (!currentReviewItemSignatures(model).has(body.target_id)) return "target_id is not present in current review-data";
  if (typeof body.anchor_id !== "string" || !body.anchor_id) return "anchor_id is required";
  if (!COMMENT_TYPES.has(body.type)) return "type must be needs-change | question | out-of-scope";
  if (body.body !== undefined && typeof body.body !== "string") return "body must be a string";
  return null;
}

/**
 * review UI와 review asset에 대한 정적 요청을 처리한다.
 *
 * @param {import("node:http").IncomingMessage} req HTTP 요청 객체.
 * @param {import("node:http").ServerResponse} res HTTP 응답 객체.
 * @param {string} pathname URL pathname.
 * @returns {Promise<void>}
 */
async function handleStatic(req, res, pathname) {
  if (pathname === "/" && legacyReviewRoot) {
    const taskSlug = taskSlugFromLegacyRoot();
    if (taskSlug) {
      res.writeHead(302, { location: `/review/${taskSlug}` });
      return res.end();
    }
  }

  if (pathname === "/" || pathname === "/review") {
    return sendText(res, 200, "Open /review/{task-slug}");
  }

  const reviewMatch = parseTaskPath(pathname, "/review/");
  if (reviewMatch && reviewMatch.segments.length === 0) {
    return sendFile(res, sharedIndexPath);
  }

  const assetMatch = parseTaskPath(pathname, "/review-assets/");
  if (assetMatch) {
    const filePath = resolveReviewAssetPath(assetMatch.taskSlug, assetMatch.segments);
    if (!filePath) {
      return sendText(res, 403, "Forbidden");
    }
    return sendFile(res, filePath);
  }

  return sendText(res, 404, "Not found");
}

/**
 * review 브라우저 API와 정적 UI를 함께 제공하는 HTTP server instance.
 *
 * @type {import("node:http").Server}
 */
const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
    } else {
      await handleStatic(req, res, pathname);
    }
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, async () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Developer review server: http://localhost:${actualPort}`);
  console.log("Open reviews at: /review/{task-slug}");
  if (legacyReviewRoot) {
    console.log(`Legacy review directory: ${path.relative(repoRoot, legacyReviewRoot) || legacyReviewRoot}`);
  }
  console.log("When review is submitted, tell Codex: review complete");
});
