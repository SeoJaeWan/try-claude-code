import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";

import { loadActiveProfile } from "../src/core/profile-loader.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(currentDir, "..", "..", "..");
export const tcpBin = path.join(repoRoot, "packages", "tcp", "bin", "tcp.mjs");
export const tcfBin = path.join(repoRoot, "packages", "tcf", "bin", "tcf.mjs");
export const tcbBin = path.join(repoRoot, "packages", "tcb", "bin", "tcb.mjs");
export const profileRegistryUrl = pathToFileURL(
  path.join(repoRoot, "profiles", "registry.json")
).href;
export const profileRawBaseUrl = pathToFileURL(repoRoot).href;
export const profileCacheDir = path.join(os.tmpdir(), "try-claude-dev-cli-test-cache");

export function createCliEnv(additional = {}) {
  return {
    ...process.env,
    TRY_CLAUDE_PROFILE_REGISTRY_URL: profileRegistryUrl,
    TRY_CLAUDE_PROFILE_RAW_BASE_URL: profileRawBaseUrl,
    TRY_CLAUDE_PROFILE_CACHE_DIR: profileCacheDir,
    ...additional
  };
}

export function runCli(binPath, argv, options = {}) {
  const { env, ...restOptions } = options;

  return spawnSync(process.execPath, [binPath, ...argv], {
    cwd: repoRoot,
    encoding: "utf8",
    env: createCliEnv(env),
    ...restOptions
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
    version,
    localProfileRoot: repoRoot
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
