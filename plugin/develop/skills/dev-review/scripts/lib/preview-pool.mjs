// Lazy pool of dev server child processes, one per task slug.
// Spawns on first acquirePreview() call, recycles after IDLE_TIMEOUT_MS of
// inactivity. shutdownAll() is wired to the server's SIGTERM/SIGINT path so
// that closing dev-review tears down every child.

import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const SPAWN_TIMEOUT_MS = 90 * 1000;
const HEALTH_POLL_MS = 200;
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

const pool = new Map();
let sweepTimer = null;

function ensureSweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [slug, entry] of pool) {
      if (entry.status === "ready" && now - entry.lastTouched > IDLE_TIMEOUT_MS) {
        releasePreview(slug).catch(() => {});
      }
    }
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
}

export function getPreviewStatus(slug) {
  const entry = pool.get(slug);
  if (!entry) return { status: "idle" };
  return {
    status: entry.status,
    port: entry.port,
    error: entry.error,
    framework_hint: entry.params?.frameworkHint || null,
  };
}

export function touchPreview(slug) {
  const entry = pool.get(slug);
  if (entry) entry.lastTouched = Date.now();
}

export async function acquirePreview(slug, params) {
  ensureSweep();
  let entry = pool.get(slug);
  if (entry) {
    entry.lastTouched = Date.now();
    if (entry.status === "ready") return entry;
    if (entry.status === "spawning" || entry.status === "installing") {
      try { await entry.readyPromise; } catch {}
      return pool.get(slug) || entry;
    }
    if (entry.status === "error") {
      pool.delete(slug);
    }
  }
  entry = {
    slug,
    status: "spawning",
    lastTouched: Date.now(),
    proc: null,
    port: null,
    error: null,
    params,
  };
  pool.set(slug, entry);
  entry.readyPromise = spawnDevServer(entry).catch((err) => {
    entry.status = "error";
    entry.error = err?.message || String(err);
    if (entry.proc) {
      try { entry.proc.kill("SIGKILL"); } catch {}
    }
  });
  await entry.readyPromise;
  return entry;
}

async function spawnDevServer(entry) {
  const { worktreePath, packagePath, packageManager } = entry.params;
  const nodeModules = path.join(packagePath, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    entry.status = "installing";
    await runInstall(packageManager, worktreePath);
  }
  const port = await pickFreePort();
  entry.port = port;
  entry.status = "spawning";

  const args = buildDevArgs(packageManager, port);
  const proc = spawn(packageManager, args, {
    cwd: packagePath,
    env: {
      ...process.env,
      PORT: String(port),
      BROWSER: "none",
      CI: "1",
    },
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  entry.proc = proc;

  proc.stdout?.on("data", () => {});
  proc.stderr?.on("data", () => {});
  proc.on("exit", (code, signal) => {
    if (entry.status === "ready" || entry.status === "error") return;
    entry.status = "error";
    entry.error = `dev server exited (code=${code}, signal=${signal})`;
  });

  await waitForReady(port, () => entry.status === "error");
  if (entry.status === "error") throw new Error(entry.error);
  entry.status = "ready";
  entry.lastTouched = Date.now();
}

function buildDevArgs(packageManager, port) {
  if (packageManager === "npm") {
    return ["run", "dev", "--", "--port", String(port)];
  }
  return ["dev", "--", "--port", String(port)];
}

async function pickFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref?.();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForReady(port, isErrored) {
  const start = Date.now();
  while (Date.now() - start < SPAWN_TIMEOUT_MS) {
    if (isErrored?.()) return;
    if (await pingPort(port)) return;
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  throw new Error(`dev server did not respond on port ${port} within ${SPAWN_TIMEOUT_MS}ms`);
}

function pingPort(port) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: "/", timeout: 2000, method: "GET" },
      (res) => {
        res.resume();
        resolve(true);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function runInstall(packageManager, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(packageManager, ["install"], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      shell: process.platform === "win32",
    });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    proc.stdout?.on("data", () => {});
    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      reject(new Error(`${packageManager} install timed out after ${INSTALL_TIMEOUT_MS}ms`));
    }, INSTALL_TIMEOUT_MS);
    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${packageManager} install exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function releasePreview(slug) {
  const entry = pool.get(slug);
  if (!entry) return;
  pool.delete(slug);
  if (!entry.proc || entry.proc.exitCode !== null) return;
  try { entry.proc.kill("SIGTERM"); } catch {}
  setTimeout(() => {
    try {
      if (entry.proc && entry.proc.exitCode === null) entry.proc.kill("SIGKILL");
    } catch {}
  }, 5000).unref?.();
}

export async function shutdownAll() {
  const slugs = Array.from(pool.keys());
  await Promise.all(slugs.map((slug) => releasePreview(slug)));
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}
