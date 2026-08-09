#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DEV_WIKI_BRANCH,
  refreshDevWikiSource
} from "./lib/source-sync.mjs";

const argv = process.argv.slice(2);

function takeFlag(name) {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(name) {
  return argv.includes(name);
}

function defaultDevWikiRoot() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return path.join(codexHome, "workbench", "dev-wiki");
}

async function readConfig(configPath) {
  if (!existsSync(configPath)) {
    throw new Error(`Dev wiki config not found: ${configPath}`);
  }

  try {
    return JSON.parse((await readFile(configPath, "utf8")).replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`Invalid dev wiki config at ${configPath}: ${error.message}`);
  }
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(
      "Usage: node <dev-wiki-skill-dir>/scripts/refresh-dev-wiki.mjs " +
      "[--dev-wiki-root <path>]"
    );
    console.log("");
    console.log("Validates the central Dev Wiki clone and fast-forwards main from origin/main.");
    return;
  }

  const devWikiRoot = path.resolve(takeFlag("--dev-wiki-root") || defaultDevWikiRoot());
  const config = await readConfig(path.join(devWikiRoot, "config.json"));

  if (typeof config.repo !== "string" || !config.repo.trim()) {
    throw new Error("Dev wiki config must define a non-empty repo.");
  }
  if (config.branch !== DEV_WIKI_BRANCH) {
    throw new Error(
      `Dev wiki config branch must be ${DEV_WIKI_BRANCH}. ` +
      `Found ${config.branch || "missing"}; run setup to repair the config.`
    );
  }

  const result = refreshDevWikiSource({
    sourceRoot: path.join(devWikiRoot, "source"),
    repo: config.repo
  });
  const shortBefore = result.beforeHead.slice(0, 7);
  const shortAfter = result.head.slice(0, 7);

  console.log(
    result.updated
      ? `Dev wiki main fast-forwarded: ${shortBefore} -> ${shortAfter}`
      : `Dev wiki main is current at ${shortAfter}`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
