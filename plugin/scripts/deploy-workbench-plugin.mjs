#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withTemporaryManifest } from "./lib/temporary-manifest.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const pluginName = "workbench";
const marketplaceName = "workbench";
const marketplaceRoot = path.join(repoRoot, "plugin");
const pluginRoot = path.join(marketplaceRoot, "plugins", pluginName);
const installTarget = `${pluginName}@${marketplaceName}`;

const hosts = {
  codex: {
    executable: "codex",
    manifestPath: path.join(pluginRoot, ".codex-plugin", "plugin.json"),
    registerCommand: `codex plugin marketplace add ${marketplaceRoot}`,
  },
  claude: {
    executable: "claude",
    manifestPath: path.join(pluginRoot, ".claude-plugin", "plugin.json"),
    registerCommand: `claude plugin marketplace add ${marketplaceRoot}`,
  },
};

const rawArgs = process.argv.slice(2);
const flagArgs = new Set(["--dry-run", "--skip-cachebuster", "--skip-install"]);
const args = new Set();
let hostArg = "all";

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (flagArgs.has(arg)) {
    args.add(arg);
  } else if (arg === "--host" && index + 1 < rawArgs.length) {
    hostArg = rawArgs[index + 1];
    index += 1;
  } else if (arg.startsWith("--host=")) {
    hostArg = arg.slice("--host=".length);
  } else {
    console.error(`Unknown option: ${arg}`);
    process.exit(2);
  }
}

if (hostArg !== "all" && !Object.hasOwn(hosts, hostArg)) {
  console.error(`Unknown host: ${hostArg}. Use codex, claude, or all.`);
  process.exit(2);
}

const selectedHosts = hostArg === "all" ? Object.keys(hosts) : [hostArg];
const dryRun = args.has("--dry-run");
const skipCachebuster = args.has("--skip-cachebuster");
const skipInstall = args.has("--skip-install");

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

function run(executable, commandArgs, options = {}) {
  const result = spawnSync(executable, commandArgs, {
    cwd: repoRoot,
    shell: process.platform === "win32",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
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

function marketplacePointsAtCurrentRoot(payload) {
  const expectedRoot = fs.realpathSync(marketplaceRoot);
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

function preflight(hostName, host) {
  const result = run(host.executable, ["plugin", "marketplace", "list", "--json"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    console.error(
      `[${hostName}] Plugin marketplace preflight failed before the manifest cachebuster was changed.`,
    );
    return false;
  }

  let marketplaces;
  try {
    marketplaces = JSON.parse(result.stdout);
  } catch {
    console.error(`[${hostName}] Plugin marketplace preflight returned invalid JSON; manifest was not changed.`);
    return false;
  }

  if (!marketplacePointsAtCurrentRoot(marketplaces)) {
    console.error(
      `[${hostName}] Marketplace ${marketplaceName} does not point at ${marketplaceRoot}; ` +
        "manifest was not changed. Register it once with:\n" +
        `  ${host.registerCommand}`,
    );
    return false;
  }

  return true;
}

function claudePluginInstalled(host) {
  const result = run(host.executable, ["plugin", "list", "--json"], { encoding: "utf8" });
  if (result.status !== 0) return false;
  try {
    return JSON.parse(result.stdout).some((entry) => entry.id === installTarget);
  } catch {
    return false;
  }
}

function installCommands(hostName, host) {
  if (hostName === "codex") {
    return [["plugin", "add", installTarget]];
  }

  const action = !dryRun && claudePluginInstalled(host) ? "update" : "install";
  return [
    ["plugin", "marketplace", "update", marketplaceName],
    ["plugin", action, installTarget],
  ];
}

function deploy(hostName) {
  const host = hosts[hostName];

  if (!dryRun && !skipInstall && !preflight(hostName, host)) {
    return 1;
  }

  const manifest = JSON.parse(fs.readFileSync(host.manifestPath, "utf8"));
  const previousVersion = manifest.version;
  let deploymentVersion = previousVersion;

  if (!skipCachebuster) {
    const baseVersion = previousVersion.split("+")[0];
    deploymentVersion = `${baseVersion}+${hostName}.local-${utcStamp()}`;
    manifest.version = deploymentVersion;

    if (dryRun) {
      console.log(`[${hostName}] [dry-run] ${previousVersion} -> ${deploymentVersion}`);
    } else if (skipInstall) {
      console.log(
        `[${hostName}] Skipping temporary plugin version: ${previousVersion} -> ${deploymentVersion} ` +
          "because installation was skipped; source manifest is unchanged.",
      );
    }
  } else {
    console.log(`[${hostName}] Keeping plugin version: ${previousVersion}`);
  }

  if (skipInstall) {
    return 0;
  }

  const commands = installCommands(hostName, host);

  if (dryRun) {
    for (const command of commands) {
      console.log(`[${hostName}] [dry-run] ${host.executable} ${command.join(" ")}`);
    }
    return 0;
  }

  const install = () => {
    for (const command of commands) {
      const result = run(host.executable, command, { stdio: "inherit" });
      if ((result.status ?? 1) !== 0) {
        return result.status ?? 1;
      }
    }
    return 0;
  };

  if (skipCachebuster) {
    return install();
  }

  console.log(`[${hostName}] Using temporary plugin version: ${previousVersion} -> ${deploymentVersion}`);
  try {
    return withTemporaryManifest(host.manifestPath, manifest, install);
  } finally {
    console.log(`[${hostName}] Restored source plugin version: ${previousVersion}`);
  }
}

let exitStatus = 0;
for (const hostName of selectedHosts) {
  const status = deploy(hostName);
  if (status !== 0) {
    exitStatus = status;
  }
}

if (selectedHosts.includes("claude") && exitStatus === 0 && !dryRun && !skipInstall) {
  console.log("[claude] Restart Claude Code or run /reload-plugins to apply the update.");
}

process.exit(exitStatus);
