import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";

import { manifest as frontendManifest } from "../../frontend/src/manifest.mjs";
import { manifest as backendManifest } from "../../backend/src/manifest.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(currentDir, "..", "..", "..");
export const frontendBin = path.join(projectRoot, "packages", "frontend", "bin", "frontend.mjs");
export const backendBin = path.join(projectRoot, "packages", "backend", "bin", "backend.mjs");

export function createCliEnv(additional = {}) {
  const currentNodeOptions = process.env.NODE_OPTIONS ?? "";

  return {
    ...process.env,
    NODE_OPTIONS: currentNodeOptions,
    ...additional
  };
}

export function runCli(binPath, argv, options = {}) {
  const { env, cwd = projectRoot, ...restOptions } = options;

  return spawnSync(process.execPath, [binPath, ...argv], {
    cwd,
    encoding: "utf8",
    env: createCliEnv({
      ...env
    }),
    ...restOptions
  });
}

export function readJson(text) {
  return JSON.parse(text);
}

export async function createTempHome(config = null) {
  const tempHome = await mkdtemp(path.join(os.tmpdir(), "dev-cli-home-"));

  if (config) {
    await writeFile(
      path.join(tempHome, ".try-claude-dev-cli.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      "utf8"
    );
  }

  return tempHome;
}

/**
 * Load a package-owned manifest by alias.
 * Replaces the old profile-loader-based loadProfile helper.
 */
export function loadManifest(alias) {
  if (alias === "frontend") {
    return frontendManifest;
  }

  if (alias === "backend") {
    return backendManifest;
  }

  throw new Error(`Unknown alias for loadManifest: ${alias}`);
}

async function writeRepoFile(repoRoot, relativePath, content) {
  const filePath = path.join(repoRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

export async function createTempRepo({
  files = {},
  tsconfig
} = {}) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-validate-"));

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
