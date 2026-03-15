import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { loadActiveProfile } from "../src/core/profile-loader.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(currentDir, "..", "..", "..");
export const tcpBin = path.join(repoRoot, "packages", "dev-cli", "bin", "tcp.mjs");
export const tcfBin = path.join(repoRoot, "packages", "dev-cli", "bin", "tcf.mjs");
export const tcbBin = path.join(repoRoot, "packages", "dev-cli", "bin", "tcb.mjs");

export function runCli(binPath, argv, options = {}) {
  return spawnSync(process.execPath, [binPath, ...argv], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options
  });
}

export function readJson(text) {
  return JSON.parse(text);
}

export async function loadProfile(role, mode = "personal", version = "v1") {
  const { profile } = await loadActiveProfile({
    repoRoot,
    role,
    mode,
    version
  });

  return profile;
}
