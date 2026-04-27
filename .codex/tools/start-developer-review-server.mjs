#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const serverPath = path.join(repoRoot, ".codex", "tools", "developer-review-server.mjs");
const argv = process.argv.slice(2);

function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(name) {
  return argv.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node .codex/tools/start-developer-review-server.mjs --task-slug <task-slug> [--plan-signature <signature>] [--port 8787] [--max-port 8797]");
  console.log("");
  console.log("Starts or reuses the platform-neutral developer review server.");
  process.exit(0);
}

const taskSlug = takeFlag("--task-slug");
const expectedPlanSignature = takeFlag("--plan-signature");
const startPort = Number(takeFlag("--port") || 8787);
const maxPort = Number(takeFlag("--max-port") || startPort + 10);

if (!taskSlug || !/^[A-Za-z0-9_-]+$/.test(taskSlug)) {
  console.error("Missing or invalid --task-slug. Use only ASCII letters, digits, _, and -.");
  process.exit(2);
}

if (!Number.isInteger(startPort) || !Number.isInteger(maxPort) || startPort < 1 || maxPort < startPort) {
  console.error("Invalid --port or --max-port.");
  process.exit(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

async function isCompatibleServer(port) {
  const health = await fetchJson(`http://localhost:${port}/api/health`);
  return health?.ok === true && health?.mode === "multi-review";
}

async function taskHealth(port) {
  return fetchJson(`http://localhost:${port}/api/reviews/${taskSlug}/health`);
}

async function waitForCompatibleServer(port) {
  for (let i = 0; i < 30; i += 1) {
    if (await isCompatibleServer(port)) return true;
    await sleep(250);
  }
  return false;
}

function startServer(port) {
  const child = spawn(process.execPath, [serverPath, "--port", String(port)], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
}

function printResult(port, reused, health) {
  const url = `http://localhost:${port}/review/${taskSlug}`;
  console.log(`developer_review_url=${url}`);
  console.log(`port=${port}`);
  console.log(`server=${reused ? "reused" : "started"}`);
  console.log(`task_slug=${taskSlug}`);
  console.log(`plan_signature=${health?.plan_signature || ""}`);
}

for (let port = startPort; port <= maxPort; port += 1) {
  if (await isCompatibleServer(port)) {
    const health = await taskHealth(port);
    if (expectedPlanSignature && health?.plan_signature !== expectedPlanSignature) {
      console.error(`Task health on port ${port} has plan_signature=${health?.plan_signature || "null"}, expected ${expectedPlanSignature}.`);
      process.exit(3);
    }
    printResult(port, true, health);
    process.exit(0);
  }

  if (await isPortOpen(port)) {
    continue;
  }

  startServer(port);
  if (!(await waitForCompatibleServer(port))) {
    continue;
  }

  const health = await taskHealth(port);
  if (expectedPlanSignature && health?.plan_signature !== expectedPlanSignature) {
    console.error(`Started server on port ${port}, but task health has plan_signature=${health?.plan_signature || "null"}, expected ${expectedPlanSignature}.`);
    process.exit(3);
  }
  printResult(port, false, health);
  process.exit(0);
}

console.error(`Could not start or reuse a compatible developer review server on ports ${startPort}-${maxPort}.`);
process.exit(1);
