#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withTemporaryManifest } from "./lib/temporary-manifest.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const pluginName = "workbench";
const marketplaceName = "local-work";
const pluginRoot = path.join(repoRoot, "codex-plugin", "plugins", pluginName);
const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");

const rawArgs = process.argv.slice(2);
const allowedArgs = new Set(["--dry-run", "--skip-cachebuster", "--skip-install"]);
const unknownArgs = rawArgs.filter((arg) => !allowedArgs.has(arg));

if (unknownArgs.length > 0) {
  console.error(`Unknown option(s): ${unknownArgs.join(", ")}`);
  process.exit(2);
}

const args = new Set(rawArgs);
const dryRun = args.has("--dry-run");
const skipCachebuster = args.has("--skip-cachebuster");
const skipInstall = args.has("--skip-install");
const codexExecutable = process.platform === "win32" ? "codex.cmd" : "codex";

function utcStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const datePart = [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("");
  const timePart = [
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
  return `${datePart}-${timePart}`;
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function collectStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, output);
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectStrings(entry, output);
  }
  return output;
}

function marketplacePointsAtCurrentPluginRoot(payload) {
  const expectedRoot = fs.realpathSync(path.join(repoRoot, "codex-plugin"));
  const namedEntries = [];

  function visit(value) {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (!value || typeof value !== "object") return;

    if (Object.values(value).some((entry) => entry === marketplaceName)) {
      namedEntries.push(value);
    }
    for (const entry of Object.values(value)) visit(entry);
  }

  visit(payload);

  return namedEntries.some((candidate) =>
    collectStrings(candidate).some((value) => {
      if (!path.isAbsolute(value)) return false;
      try {
        return fs.realpathSync(value) === expectedRoot;
      } catch {
        return false;
      }
    }),
  );
}

if (!dryRun && !skipInstall) {
  const preflight = spawnSync(
    codexExecutable,
    ["plugin", "marketplace", "list", "--json"],
    {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    },
  );

  if (preflight.error) {
    throw preflight.error;
  }

  if (preflight.status !== 0) {
    if (preflight.stdout) process.stdout.write(preflight.stdout);
    if (preflight.stderr) process.stderr.write(preflight.stderr);
    console.error(
      "Plugin marketplace preflight failed before the manifest cachebuster was changed. " +
        "Confirm that local-work points at this checkout's codex-plugin directory, or integrate " +
        "the branch into the configured marketplace checkout first.",
    );
    process.exit(preflight.status ?? 1);
  }

  let marketplaces;
  try {
    marketplaces = JSON.parse(preflight.stdout);
  } catch {
    console.error("Plugin marketplace preflight returned invalid JSON; manifest was not changed.");
    process.exit(1);
  }

  if (!marketplacePointsAtCurrentPluginRoot(marketplaces)) {
    console.error(
      `Marketplace ${marketplaceName} does not point at ${path.join(repoRoot, "codex-plugin")}; ` +
        "manifest was not changed. Integrate into the configured checkout or explicitly " +
        "reconfigure that local marketplace before deploying.",
    );
    process.exit(1);
  }
}

const manifest = readManifest();
const previousVersion = manifest.version;
let deploymentVersion = previousVersion;

if (!skipCachebuster) {
  const baseVersion = previousVersion.split("+")[0];
  deploymentVersion = `${baseVersion}+codex.local-${utcStamp()}`;
  manifest.version = deploymentVersion;

  if (dryRun) {
    console.log(`[dry-run] ${previousVersion} -> ${deploymentVersion}`);
  } else if (skipInstall) {
    console.log(
      `Skipping temporary plugin version: ${previousVersion} -> ${deploymentVersion} ` +
        "because installation was skipped; source manifest is unchanged.",
    );
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
    const install = () => {
      const result = spawnSync(codexExecutable, command.slice(1), {
        cwd: repoRoot,
        stdio: "inherit",
        shell: process.platform === "win32",
      });

      if (result.error) {
        throw result.error;
      }

      return result.status ?? 1;
    };

    let installStatus;
    if (skipCachebuster) {
      installStatus = install();
    } else {
      console.log(
        `Using temporary plugin version: ${previousVersion} -> ${deploymentVersion}`,
      );
      try {
        installStatus = withTemporaryManifest(manifestPath, manifest, install);
      } finally {
        console.log(`Restored source plugin version: ${previousVersion}`);
      }
    }

    if (installStatus !== 0) {
      process.exit(installStatus);
    }
  }
}
