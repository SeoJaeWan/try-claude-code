#!/usr/bin/env node

// dev-review server — Claude-side, plugin-internal, multi-review (schema v2).
//
// Hosts every task review under /review/{slug} simultaneously. Granular
// endpoints replace the v1 whole-blob feedback POST: comments are CRUD'd
// individually, commit_status is toggled, and submit is a separate call.

import { createServer } from "node:http";
import { readFile, rename, stat, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
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
  console.log("  --plans-root  defaults to ${cwd}/plans. The server resolves each task review");
  console.log("                under {plans-root}/{task-slug}/dev-review/.");
  console.log("  --port        default 9797.");
  console.log("");
  console.log("Open a task review at http://localhost:{port}/review/{task-slug}.");
  console.log("Multiple Claude sessions may share one server: the second session's");
  console.log("health-check will find this process and reuse it.");
  process.exit(0);
}

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

const SLUG_RE = /^[A-Za-z0-9_-]+$/;
const SHA_RE = /^[a-f0-9]{40}$/;
const COMMENT_ID_RE = /^cm_\d+$/;
const VALID_SIDES = new Set(["new", "old"]);

const isSafeSlug = (s) => typeof s === "string" && SLUG_RE.test(s);

function dataRootForSlug(slug) {
  if (!isSafeSlug(slug)) return null;
  const root = path.resolve(plansRoot, slug, "dev-review");
  const prefix = `${path.resolve(plansRoot)}${path.sep}`;
  if (!root.startsWith(prefix)) return null;
  return root;
}

function parseReviewPath(pathname) {
  if (!pathname.startsWith("/review/")) return null;
  const rest = pathname.slice("/review/".length);
  const slashIdx = rest.indexOf("/");
  const slug = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
  const tail = slashIdx === -1 ? "" : rest.slice(slashIdx + 1);
  if (!isSafeSlug(slug)) return null;
  return { slug, tail };
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, value) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(value);
}

function sendHtml(res, status, value) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(value);
}

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

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
}

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

async function listAvailableReviews() {
  try {
    const entries = await readdir(plansRoot, { withFileTypes: true });
    const slugs = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (!isSafeSlug(e.name)) continue;
      const dataRoot = path.resolve(plansRoot, e.name, "dev-review");
      if (existsSync(path.join(dataRoot, "review-data.json"))) {
        slugs.push(e.name);
      }
    }
    return slugs.sort();
  } catch {
    return [];
  }
}

async function handleServerHealth(res) {
  const reviews = await listAvailableReviews();
  return sendJson(res, 200, {
    ok: true,
    kind: "dev-review",
    schema_version: 2,
    plans_root: plansRoot,
    html_root: htmlRoot,
    available_reviews: reviews,
  });
}

async function handleIndexListing(res) {
  const reviews = await listAvailableReviews();
  if (reviews.length === 0) {
    return sendText(res, 200, "No dev-review packages found under " + plansRoot + "\nOpen /review/{task-slug} once a review is generated.");
  }
  const lines = reviews.map((s) => `  • http://localhost:${port}/review/${s}`).join("\n");
  return sendText(res, 200, "dev-review server (multi-review)\n\nAvailable reviews:\n" + lines + "\n");
}

let cachedIndexHtml = null;
async function readIndexHtml() {
  if (cachedIndexHtml === null) {
    cachedIndexHtml = await readFile(path.join(htmlRoot, "index.html"), "utf8");
  }
  return cachedIndexHtml;
}

async function handleReviewPage(req, res, slug) {
  const dataRoot = dataRootForSlug(slug);
  if (!dataRoot) return sendText(res, 400, "Invalid task slug");
  if (!existsSync(dataRoot)) return sendText(res, 404, `No review at ${dataRoot}`);
  let html;
  try {
    html = await readIndexHtml();
  } catch {
    return sendText(res, 500, "index.html not readable");
  }
  const baseTag = `<base href="/review/${slug}/">`;
  const injected = html.replace(/<head>/i, `<head>\n  ${baseTag}`);
  return sendHtml(res, 200, injected);
}

function resolveStaticForReview(slug, tail) {
  const dataRoot = dataRootForSlug(slug);
  if (!dataRoot) return null;

  if (tail === "" || tail === "index.html") return null;

  if (tail.startsWith("vendor/")) {
    const resolved = path.resolve(htmlRoot, tail);
    if (!resolved.startsWith(`${htmlRoot}${path.sep}`)) return null;
    return resolved;
  }

  const dataPathStaticFiles = ["review-data.json", "feedback.json", "review-history.json"];
  if (dataPathStaticFiles.includes(tail)) {
    return path.join(dataRoot, tail);
  }
  if (tail.startsWith("assets/diffs/")) {
    const resolved = path.resolve(dataRoot, tail);
    if (!resolved.startsWith(`${dataRoot}${path.sep}`)) return null;
    return resolved;
  }
  return null;
}

// ---------- feedback.json helpers ----------

async function loadFeedback(dataRoot) {
  return readJsonFile(path.join(dataRoot, "feedback.json"), null);
}

async function saveFeedback(dataRoot, fb) {
  fb.updated_at = new Date().toISOString();
  await writeJsonAtomic(path.join(dataRoot, "feedback.json"), fb);
}

async function loadModel(dataRoot) {
  return readJsonFile(path.join(dataRoot, "review-data.json"), null);
}

function ensureFeedbackShape(fb, model, slug) {
  // Defensive: bring whatever's on disk up to v2 shape if a field is missing.
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

function nextCommentId(fb) {
  let max = 0;
  for (const c of fb.comments) {
    const m = /^cm_(\d+)$/.exec(c.id || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `cm_${String(max + 1).padStart(3, "0")}`;
}

function validateAgainstModel(fb, model, slug) {
  if (fb.task_slug && fb.task_slug !== slug) {
    return { error: "task_slug mismatch", status: 409 };
  }
  if (fb.plan_signature && model?.plan_signature && fb.plan_signature !== model.plan_signature) {
    return { error: "plan_signature mismatch — please reload", status: 409 };
  }
  return null;
}

function commitShaSet(model) {
  const set = new Set();
  for (const c of model?.commits ?? []) set.add(c.sha);
  return set;
}

function fileExistsInCommit(model, sha, file) {
  for (const c of model?.commits ?? []) {
    if (c.sha !== sha) continue;
    return c.files_changed.some((f) => f.path === file);
  }
  return false;
}

function isAvailableAgent(model, name) {
  return (model?.available_agents ?? []).some((a) => a.name === name);
}

// ---------- API ----------

async function handleReviewApi(req, res, slug, endpoint) {
  const dataRoot = dataRootForSlug(slug);
  if (!dataRoot) return sendJson(res, 400, { error: "invalid slug" });

  if (endpoint === "health") {
    const model = await loadModel(dataRoot);
    return sendJson(res, 200, {
      ok: true,
      slug,
      data_root: dataRoot,
      schema_version: model?.schema_version ?? null,
      plan_signature: model?.plan_signature ?? null,
      review_iteration: model?.review_iteration ?? null,
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

  return sendJson(res, 404, { error: "not found" });
}

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

async function handleSubmit(req, res, slug, dataRoot) {
  const model = await loadModel(dataRoot);
  if (!model) return sendJson(res, 404, { error: "review-data.json not found" });

  let fb = await loadFeedback(dataRoot);
  fb = ensureFeedbackShape(fb, model, slug);

  // Server-side guardrail: every needs-change comment must carry a valid agent.
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

    const review = parseReviewPath(pathname);
    if (!review) return sendText(res, 404, "Not found");

    if (review.tail === "" || review.tail === "/") {
      return handleReviewPage(req, res, review.slug);
    }

    if (review.tail.startsWith("api/")) {
      return handleReviewApi(req, res, review.slug, review.tail.slice("api/".length));
    }

    const filePath = resolveStaticForReview(review.slug, review.tail);
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
  console.log("Open a review at /review/{task-slug}");
  console.log("When a review is submitted, tell Claude: 리뷰 완료");
});

let shuttingDown = false;
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
