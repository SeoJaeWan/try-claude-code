#!/usr/bin/env node

/**
 * planning docs 브라우저 서버를 시작하거나 기존 호환 서버를 재사용하는 CLI 스크립트.
 *
 * 지정된 task slug의 planning docs package가 현재 plan signature와 맞는지 확인한 뒤,
 * Codex가 사용자에게 전달할 `planning_docs_url`을 출력한다.
 */

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const serverPath = path.join(repoRoot, ".codex", "tools", "planning-docs-browser-server.mjs");
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

/**
 * CLI 인자 목록에 boolean flag가 있는지 확인한다.
 *
 * @param {string} name 찾을 flag 이름.
 * @returns {boolean} flag가 존재하면 `true`.
 */
function hasFlag(name) {
  return argv.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node .codex/tools/start-planning-docs-browser-server.mjs --task-slug <task-slug> [--plan-signature <signature>] [--port 8787] [--max-port 8797]");
  console.log("");
  console.log("Starts or reuses the platform-neutral planning docs browser server.");
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

/**
 * 지정한 시간만큼 비동기로 대기한다.
 *
 * @param {number} ms 대기할 밀리초.
 * @returns {Promise<void>} 대기 완료 Promise.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * URL에서 JSON 응답을 읽되 실패하면 `null`을 반환한다.
 *
 * @param {string} url 요청할 URL.
 * @returns {Promise<object | null>} 파싱된 JSON 객체 또는 실패 시 `null`.
 */
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * localhost의 특정 port가 이미 열려 있는지 확인한다.
 *
 * @param {number} port 확인할 TCP port.
 * @returns {Promise<boolean>} 연결 가능하면 `true`.
 */
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

/**
 * 지정 port의 서버가 multi-review 모드의 review 서버인지 확인한다.
 *
 * @param {number} port 확인할 port.
 * @returns {Promise<boolean>} 호환 서버이면 `true`.
 */
async function isCompatibleServer(port) {
  const health = await fetchJson(`http://localhost:${port}/api/health`);
  return health?.ok === true && health?.kind === "planning-docs" && health?.mode === "multi-review";
}

/**
 * 현재 task slug에 대한 planning docs package health 정보를 읽는다.
 *
 * @param {number} port review 서버 port.
 * @returns {Promise<object | null>} task health JSON 또는 실패 시 `null`.
 */
async function taskHealth(port) {
  return fetchJson(`http://localhost:${port}/api/reviews/${taskSlug}/health`);
}

/**
 * 새로 시작한 서버가 health endpoint를 열 때까지 짧게 대기한다.
 *
 * @param {number} port 대기할 서버 port.
 * @returns {Promise<boolean>} 제한 시간 안에 호환 서버가 확인되면 `true`.
 */
async function waitForCompatibleServer(port) {
  for (let i = 0; i < 30; i += 1) {
    if (await isCompatibleServer(port)) return true;
    await sleep(250);
  }
  return false;
}

/**
 * review 서버 프로세스를 백그라운드로 시작한다.
 *
 * @param {number} port 서버가 listen할 port.
 * @returns {void}
 */
function startServer(port) {
  const child = spawn(process.execPath, [serverPath, "--port", String(port)], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
}

/**
 * Codex orchestration이 읽을 수 있는 key=value 결과를 출력한다.
 *
 * @param {number} port 사용 중인 서버 port.
 * @param {boolean} reused 기존 서버를 재사용했으면 `true`.
 * @param {object | null} health task health 응답.
 * @returns {void}
 */
function printResult(port, reused, health) {
  const url = `http://localhost:${port}/review/${taskSlug}`;
  console.log(`planning_docs_url=${url}`);
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

console.error(`Could not start or reuse a compatible planning docs browser server on ports ${startPort}-${maxPort}.`);
process.exit(1);
