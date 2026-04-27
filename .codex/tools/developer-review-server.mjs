#!/usr/bin/env node

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
  console.log("Usage: node .codex/tools/developer-review-server.mjs [review-dir] [--port 8787]");
  console.log("");
  console.log("Open reviews at /review/{task-slug}.");
  console.log("When [review-dir] is passed, / redirects to the matching /review/{task-slug} URL.");
  process.exit(0);
}

function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

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

function sendJson(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, value) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
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
    ".webp": "image/webp"
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

function isSafeTaskSlug(taskSlug) {
  return typeof taskSlug === "string" && /^[A-Za-z0-9_-]+$/.test(taskSlug);
}

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

function taskSlugFromLegacyRoot() {
  if (!legacyReviewRoot) return null;
  const taskSlug = path.basename(path.dirname(legacyReviewRoot));
  return isSafeTaskSlug(taskSlug) ? taskSlug : null;
}

function parseTaskPath(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const [taskSlug, ...segments] = rest.split("/").filter(Boolean);
  if (!isSafeTaskSlug(taskSlug)) return null;
  return { taskSlug, segments };
}

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

async function currentReviewModel(reviewRoot) {
  return readJsonFile(path.join(reviewRoot, "review-data.json"), null);
}

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

      feedback.updated_at = new Date().toISOString();
      await writeJsonAtomic(path.join(reviewRoot, "feedback.json"), feedback);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: "not found" });
}

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
