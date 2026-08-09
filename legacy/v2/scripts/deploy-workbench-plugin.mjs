#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const pluginName = "workbench";
const marketplaceName = "local-work";
const pluginRoot = path.join(repoRoot, "codex-plugin", "plugins", pluginName);
const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipCachebuster = args.has("--skip-cachebuster");
const skipInstall = args.has("--skip-install");

function utcStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(manifest) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const manifest = readManifest();
const previousVersion = manifest.version;

if (!skipCachebuster) {
  const baseVersion = previousVersion.split("+")[0];
  manifest.version = `${baseVersion}+codex.${utcStamp()}`;

  if (dryRun) {
    console.log(`[dry-run] ${previousVersion} -> ${manifest.version}`);
  } else {
    writeManifest(manifest);
    console.log(`Updated plugin version: ${previousVersion} -> ${manifest.version}`);
  }
} else {
  console.log(`Keeping plugin version: ${previousVersion}`);
}

if (!skipInstall) {
  const installTarget = `${pluginName}@${marketplaceName}`;
  const command = ["codex", "plugin", "add", installTarget];

  if (dryRun) {
    console.log(`[dry-run] ${command.join(" ")}`);
  } else {
    const executable = process.platform === "win32" ? "codex.cmd" : command[0];
    const result = spawnSync(executable, command.slice(1), {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}
