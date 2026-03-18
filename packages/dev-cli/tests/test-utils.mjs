import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";

import { loadActiveProfile } from "../src/core/profile-loader.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(currentDir, "..", "..", "..");
export const tcpBin = path.join(repoRoot, "packages", "tcp", "bin", "tcp.mjs");
export const tcfBin = path.join(repoRoot, "packages", "tcf", "bin", "tcf.mjs");
export const tcbBin = path.join(repoRoot, "packages", "tcb", "bin", "tcb.mjs");
const fetchFixtureLoader = pathToFileURL(
  path.join(currentDir, "test-fetch-fixture-loader.mjs")
).href;
const defaultConfiguredHome = mkdtempSync(path.join(os.tmpdir(), "dev-cli-home-"));

mkdirSync(defaultConfiguredHome, { recursive: true });
writeFileSync(
  path.join(defaultConfiguredHome, ".try-claude-dev-cli.json"),
  `${JSON.stringify({
    profiles: {
      publisher: {
        mode: "personal",
        version: "v1"
      },
      frontend: {
        mode: "personal",
        version: "v1"
      },
      backend: {
        mode: "personal",
        version: "v1"
      }
    }
  }, null, 2)}\n`,
  "utf8"
);

export function createCliEnv(additional = {}) {
  const currentNodeOptions = process.env.NODE_OPTIONS ?? "";
  const importOption = `--import "${fetchFixtureLoader}"`;
  const homeDirectory = additional.HOME ?? additional.USERPROFILE ?? defaultConfiguredHome;

  return {
    ...process.env,
    NODE_OPTIONS: currentNodeOptions.includes(importOption)
      ? currentNodeOptions
      : `${currentNodeOptions} ${importOption}`.trim(),
    HOME: homeDirectory,
    USERPROFILE: homeDirectory,
    ...additional
  };
}

export function runCli(binPath, argv, options = {}) {
  const { env, cwd = repoRoot, ...restOptions } = options;
  const defaultProfileRoot = existsSync(path.join(cwd, "profiles"))
    ? cwd
    : repoRoot;

  return spawnSync(process.execPath, [binPath, ...argv], {
    cwd,
    encoding: "utf8",
    env: createCliEnv({
      TRY_CLAUDE_TEST_PROFILE_ROOT: env?.TRY_CLAUDE_TEST_PROFILE_ROOT ?? defaultProfileRoot,
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

  await writeRepoFile(
    tempRoot,
    "profiles/registry.json",
    `${JSON.stringify({
      publisher: {
        personal: ["v1"]
      },
      frontend: {
        personal: ["v1"]
      },
      backend: {
        personal: ["v1"]
      }
    }, null, 2)}\n`
  );

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
