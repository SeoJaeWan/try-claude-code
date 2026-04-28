#!/usr/bin/env node

// dev-review server — Claude-side, plugin-internal, multi-review.
//
// This is independent from the orchestrator's server at
// `.codex/tools/developer-review-server.mjs`. The two share nothing.
//
// One server process can host many task reviews simultaneously, so
// multiple Claude sessions launching this server collide cleanly:
// the second session's health-check finds an existing dev-review
// server and reuses it, just opening a different /review/{slug} URL.
//
// URL scheme:
//   GET  /                                       → help
//   GET  /api/health                             → server diagnostic
//   GET  /review/{slug}                          → UI page (HTML w/ <base>)
//   GET  /review/{slug}/                         → same as above
//   GET  /review/{slug}/vendor/{...}             → plugin html-root
//   GET  /review/{slug}/review-data.json         → plans/{slug}/dev-review/
//   GET  /review/{slug}/feedback.json            → plans/{slug}/dev-review/
//   GET  /review/{slug}/review-history.json      → plans/{slug}/dev-review/
//   GET  /review/{slug}/assets/diffs/{...}       → plans/{slug}/dev-review/assets/diffs/
//   GET  /review/{slug}/api/health               → per-review diagnostic
//   GET  /review/{slug}/api/review-data          → JSON proxy
//   GET  /review/{slug}/api/feedback             → JSON proxy
//   POST /review/{slug}/api/feedback             → write w/ task_slug+plan_signature check
//
// The shared HTML lives in this plugin's assets/ directory and is
// served verbatim with a `<base href="/review/{slug}/">` injected so
// every relative URL inside it resolves to the correct task without
// hard-coding the slug into the static file.

import { createServer } from "node:http";
import { readFile, rename, stat, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  acquirePreview,
  getPreviewStatus,
  shutdownAll as shutdownPreviewPool,
  touchPreview,
} from "./lib/preview-pool.mjs";

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
  const tmp = `${filePath}.tmp`;
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
  // Inject <base href="/review/{slug}/"> right after <head> so every
  // relative URL the SPA fetches (review-data.json, vendor/*.js, assets/diffs/*)
  // resolves into this slug's URL space without per-task HTML mutation.
  const baseTag = `<base href="/review/${slug}/">`;
  const injected = html.replace(/<head>/i, `<head>\n  ${baseTag}`);
  return sendHtml(res, 200, injected);
}

function resolveStaticForReview(slug, tail) {
  const dataRoot = dataRootForSlug(slug);
  if (!dataRoot) return null;

  // Plugin-owned UI shell — same for every slug.
  if (tail === "" || tail === "index.html") {
    return null; // index handled by handleReviewPage with <base> injection
  }
  if (tail.startsWith("vendor/")) {
    const resolved = path.resolve(htmlRoot, tail);
    if (!resolved.startsWith(`${htmlRoot}${path.sep}`)) return null;
    return resolved;
  }

  // Per-task data — must live under the task's data-root.
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

// Reads review-data.json's `preview` block, which the skill's Step 3 wrote.
// The server itself does no workspace detection — picking the right preview
// package requires judging library-vs-app and workspace dependencies, which
// the skill does at generate time. See SKILL.md Step 3 and
// references/review-data-schema.md.
async function readPreviewDecision(slug) {
  const dataRoot = dataRootForSlug(slug);
  if (!dataRoot) return null;
  const model = await readJsonFile(path.join(dataRoot, "review-data.json"), null);
  if (!model) return null;
  const preview = model.preview;
  if (!preview || typeof preview !== "object") {
    return {
      task_head_sha: model.task_head_sha,
      decision: {
        supported: false,
        reason: "review-data.json has no `preview` block — re-run dev-review to regenerate",
      },
    };
  }
  if (preview.supported !== true) {
    return {
      task_head_sha: model.task_head_sha,
      decision: {
        supported: false,
        reason: preview.reason || "preview not supported",
        rationale: preview.rationale || null,
      },
    };
  }
  // Validate spawn-required fields. The skill is supposed to set these when
  // supported=true, but a malformed entry should surface as unsupported with a
  // diagnostic reason rather than crashing the spawn.
  if (!preview.package_path || !preview.package_manager) {
    return {
      task_head_sha: model.task_head_sha,
      decision: {
        supported: false,
        reason: "preview.supported=true but missing package_path/package_manager",
        rationale: preview.rationale || null,
      },
    };
  }
  // worktree_path is informational only — the pool spawns with cwd = package_path,
  // which is already absolute. We pass worktree_path through for the install-step
  // log message in the pool when node_modules is missing.
  const worktreePath =
    model.worktree_path && path.isAbsolute(model.worktree_path)
      ? model.worktree_path
      : path.resolve(plansRoot, "..", "worktrees", String(model.task_branch || ""));
  return {
    task_head_sha: model.task_head_sha,
    decision: {
      supported: true,
      worktreePath,
      packagePath: preview.package_path,
      packageManager: preview.package_manager,
      frameworkHint: preview.framework_hint || "unknown",
      rationale: preview.rationale || null,
    },
  };
}

async function handlePreviewStatus(res, slug) {
  const result = await readPreviewDecision(slug);
  if (!result) {
    return sendJson(res, 404, { supported: false, reason: "review-data not found" });
  }
  const { decision } = result;
  if (!decision.supported) {
    return sendJson(res, 200, {
      supported: false,
      reason: decision.reason,
      rationale: decision.rationale || null,
      framework_hint: null,
      status: "unsupported",
    });
  }
  // Defensive check: if the worktree was removed (manual `git worktree remove`,
  // runner cleanup) the spawn would ENOENT. Surface it as unsupported instead
  // of letting acquirePreview() crash and emit a confusing log.
  if (!existsSync(decision.packagePath)) {
    return sendJson(res, 200, {
      supported: false,
      reason: `package_path no longer exists on disk: ${decision.packagePath}`,
      rationale: decision.rationale,
      framework_hint: decision.frameworkHint,
      status: "unsupported",
    });
  }
  // Lazy spawn: only triggers when no entry exists yet. Subsequent polls
  // hit the existing pool entry without re-spawning.
  acquirePreview(slug, {
    worktreePath: decision.worktreePath,
    packagePath: decision.packagePath,
    packageManager: decision.packageManager,
    frameworkHint: decision.frameworkHint,
  }).catch(() => {});
  touchPreview(slug);
  const poolStatus = getPreviewStatus(slug);
  return sendJson(res, 200, {
    supported: true,
    framework_hint: decision.frameworkHint,
    package_manager: decision.packageManager,
    rationale: decision.rationale,
    status: poolStatus.status,
    error: poolStatus.error || null,
    last_log: poolStatus.last_log || [],
    spawn_started_at: poolStatus.spawn_started_at || null,
    url:
      poolStatus.status === "ready" && poolStatus.port
        ? `http://localhost:${poolStatus.port}`
        : null,
  });
}

async function handleReviewApi(req, res, slug, endpoint) {
  const dataRoot = dataRootForSlug(slug);
  if (!dataRoot) return sendJson(res, 400, { error: "invalid slug" });

  if (endpoint === "preview/status" && req.method === "GET") {
    return handlePreviewStatus(res, slug);
  }

  if (endpoint === "health") {
    const model = await readJsonFile(path.join(dataRoot, "review-data.json"), null);
    return sendJson(res, 200, {
      ok: true,
      slug,
      data_root: dataRoot,
      plan_signature: model?.plan_signature || null,
      review_iteration: model?.review_iteration ?? null,
    });
  }

  if (endpoint === "review-data" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(dataRoot, "review-data.json"), {}));
  }

  if (endpoint === "feedback" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(dataRoot, "feedback.json"), {}));
  }

  if (endpoint === "feedback" && req.method === "POST") {
    try {
      const fb = JSON.parse(await readBody(req));
      if (!fb || typeof fb !== "object") {
        return sendJson(res, 400, { error: "feedback must be an object" });
      }
      const model = await readJsonFile(path.join(dataRoot, "review-data.json"), null);
      if (!model) {
        return sendJson(res, 404, { error: "review-data.json not found" });
      }
      // Reject cross-task or stale feedback so two simultaneous sessions
      // can't write across each other. The browser always knows its slug
      // (from <base href>) and its plan_signature (from review-data.json).
      if (fb.task_slug && fb.task_slug !== slug) {
        return sendJson(res, 409, { error: "task_slug mismatch" });
      }
      if (fb.plan_signature && model.plan_signature && fb.plan_signature !== model.plan_signature) {
        return sendJson(res, 409, { error: "plan_signature mismatch" });
      }
      fb.updated_at = new Date().toISOString();
      await writeJsonAtomic(path.join(dataRoot, "feedback.json"), fb);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: "not found" });
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");

    // Server-level diagnostic. The launcher's health-check polls this to
    // decide whether an existing process is a compatible dev-review server
    // (and thus reusable across sessions) or a foreign collision.
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
  console.log(`dev-review server (multi-review): http://localhost:${actualPort}`);
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
  try { await shutdownPreviewPool(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref?.();
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Keep the dev-review server alive when a child dev server's spawn flow
// throws asynchronously. Without this, an ENOENT on a stale worktree path
// can take down the whole process and leave reviewers staring at a frozen
// "부팅 중…" placeholder.
process.on("unhandledRejection", (err) => {
  console.error("[dev-review] unhandledRejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("[dev-review] uncaughtException:", err);
});
