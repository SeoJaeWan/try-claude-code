#!/usr/bin/env node

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node ./.codex/scripts/plan-revision.mjs --plan <path-to-plan.md> [--json]",
      "",
      "Outputs the deterministic plan_revision fingerprint for one plan.md plus",
      "its linked ./phases/*.md files. Default output is the fingerprint only.",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const options = {
    json: false,
    plan: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--json") {
      options.json = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token === "--plan") {
      options.plan = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token.startsWith("--plan=")) {
      options.plan = token.slice("--plan=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function resolveWorkspaceRoot(cwd) {
  try {
    return execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return cwd;
  }
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function normalizeMarkdownBytes(buffer) {
  let text = buffer.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  text = text.replace(/\r\n?/g, "\n");
  return Buffer.from(text, "utf8");
}

function collectLinkedPhaseRelativePaths(planText) {
  const matches = planText.match(/\.\/phases\/[A-Za-z0-9._/-]+\.md/g) ?? [];
  const seen = new Set();
  const ordered = [];

  for (const match of matches) {
    if (seen.has(match)) {
      continue;
    }
    seen.add(match);
    ordered.push(match);
  }

  return ordered;
}

function ensureFileExists(filePath, label) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }

  if (!stat.isFile()) {
    throw new Error(`${label} is not a file: ${filePath}`);
  }
}

function buildPlanRevision(planPath, workspaceRoot) {
  const resolvedPlanPath = path.resolve(planPath);
  ensureFileExists(resolvedPlanPath, "Plan file");

  const planDir = path.dirname(resolvedPlanPath);
  const planText = fs.readFileSync(resolvedPlanPath, "utf8");
  const linkedPhaseRelativePaths = collectLinkedPhaseRelativePaths(planText);
  const linkedPhasePaths = linkedPhaseRelativePaths.map((relativePhasePath) => {
    const absolutePhasePath = path.resolve(planDir, relativePhasePath);
    ensureFileExists(absolutePhasePath, "Linked phase detail file");
    return absolutePhasePath;
  });

  const planAndPhasePaths = [resolvedPlanPath, ...linkedPhasePaths];
  const hashFilePaths = [...new Set(planAndPhasePaths)]
    .map((filePath) => {
      const relativePath = path.relative(workspaceRoot, filePath);
      if (!relativePath || relativePath.startsWith("..")) {
        throw new Error(`Plan revision inputs must stay inside the workspace: ${filePath}`);
      }
      return {
        absolutePath: filePath,
        relativePath: toPosixPath(relativePath),
      };
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));

  const hasher = createHash("sha256");
  for (const file of hashFilePaths) {
    hasher.update(file.relativePath, "utf8");
    hasher.update("\n", "utf8");
    hasher.update(normalizeMarkdownBytes(fs.readFileSync(file.absolutePath)));
    hasher.update("\n", "utf8");
  }

  return {
    workspaceRoot,
    taskSlug: path.basename(path.dirname(resolvedPlanPath)),
    planPath: toPosixPath(path.relative(workspaceRoot, resolvedPlanPath)),
    linkedPhasePaths: linkedPhasePaths.map((filePath) => toPosixPath(path.relative(workspaceRoot, filePath))),
    hashFilePaths: hashFilePaths.map((file) => file.relativePath),
    planRevision: hasher.digest("hex"),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  if (!options.plan) {
    throw new Error("Missing required --plan <path-to-plan.md> argument.");
  }

  const workspaceRoot = resolveWorkspaceRoot(process.cwd());
  const result = buildPlanRevision(options.plan, workspaceRoot);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${result.planRevision}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
