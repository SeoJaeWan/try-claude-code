#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2);

if (!args[0] || args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node .codex/tools/developer-review-server.mjs <review-dir> [--port 8787]");
  process.exit(args[0] ? 0 : 1);
}

const reviewRoot = path.resolve(process.cwd(), args[0]);
const portFlag = args.indexOf("--port");
const requestedPort = portFlag >= 0 ? Number(args[portFlag + 1]) : 8787;
const port = Number.isFinite(requestedPort) ? requestedPort : 8787;
const feedbackPath = path.join(reviewRoot, "feedback.json");

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

function resolveStaticPath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const resolved = path.resolve(reviewRoot, relativePath);
  if (!resolved.startsWith(`${reviewRoot}${path.sep}`) && resolved !== reviewRoot) {
    return null;
  }
  return resolved;
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, review_root: reviewRoot });
  }

  if (pathname === "/api/review-data" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(path.join(reviewRoot, "review-data.json"), {}));
  }

  if (pathname === "/api/feedback" && req.method === "GET") {
    return sendJson(res, 200, await readJsonFile(feedbackPath, {}));
  }

  if (pathname === "/api/feedback" && req.method === "POST") {
    try {
      const feedback = JSON.parse(await readBody(req));
      if (!feedback || typeof feedback !== "object") {
        return sendJson(res, 400, { error: "feedback must be an object" });
      }
      feedback.updated_at = new Date().toISOString();
      await writeJsonAtomic(feedbackPath, feedback);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: "not found" });
}

async function handleStatic(req, res) {
  const filePath = resolveStaticPath(req.url);
  if (!filePath) {
    return sendText(res, 403, "Forbidden");
  }

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

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
    } else {
      await handleStatic(req, res);
    }
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, async () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Developer review server: http://localhost:${actualPort}`);
  console.log(`Review directory: ${path.relative(repoRoot, reviewRoot) || reviewRoot}`);
  console.log("When review is submitted, tell Codex: 리뷰 완료");
});
