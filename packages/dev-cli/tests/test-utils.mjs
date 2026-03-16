import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";

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

async function writeRepoFile(repoRoot, relativePath, content) {
  const filePath = path.join(repoRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function copyProfileTree(tempRoot, profileId) {
  const source = path.join(repoRoot, "profiles", ...profileId.split("/"));
  const target = path.join(tempRoot, "profiles", ...profileId.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, {
    recursive: true
  });
}

export async function createTempRepo({
  files = {},
  profiles = ["shared/personal/v1", "publisher/personal/v1", "frontend/personal/v1"],
  tsconfig
} = {}) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-validate-"));

  for (const profileId of profiles) {
    await copyProfileTree(tempRoot, profileId);
  }

  if (tsconfig) {
    await writeRepoFile(
      tempRoot,
      "tsconfig.json",
      `${JSON.stringify(tsconfig, null, 2)}\n`
    );
  }

  for (const [relativePath, content] of Object.entries(files)) {
    await writeRepoFile(tempRoot, relativePath, content);
  }

  return tempRoot;
}
