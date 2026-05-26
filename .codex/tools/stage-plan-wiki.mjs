#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const argv = process.argv.slice(2);

function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(name) {
  return argv.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node .codex/tools/stage-plan-wiki.mjs [--workspace-root <path>] [--source-root <path>] [--repo <git-url>] [--branch <name>]");
  console.log("");
  console.log("Prepares ./.codex/plan-wiki/source as the project-local clone of the shared plan wiki Git repository.");
  console.log("Planning agents read ./.codex/plan-wiki/source/wiki directly; no sync/current link is created.");
  process.exit(0);
}

function fullPath(value) {
  return path.resolve(value);
}

async function readConfig(workspaceRoot) {
  const configPath = path.join(workspaceRoot, ".codex", "plan-wiki", "config.json");
  try {
    const raw = await readFile(configPath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`Invalid plan wiki config at ${configPath}: ${error.message}`);
  }
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
    throw new Error(`git ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }
  return result.stdout.trim();
}

function ensureDirectory(label, value) {
  if (!existsSync(value) || !lstatSync(value).isDirectory()) {
    throw new Error(`${label} not found: ${value}`);
  }
}

function ensureGitRepo(sourceRoot) {
  ensureDirectory("Plan wiki source root", sourceRoot);
  runGit(["rev-parse", "--is-inside-work-tree"], sourceRoot);
}

function verifyPlanWiki(sourceRoot) {
  const required = [
    "wiki/registry.json",
    "wiki/core",
    "wiki/patterns",
    "wiki/tags",
    "wiki/_meta",
    "raw",
    "feedback",
    "history"
  ];

  for (const relativePath of required) {
    const target = path.join(sourceRoot, relativePath);
    if (!existsSync(target)) {
      throw new Error(`Plan wiki source is missing ${relativePath}: ${target}`);
    }
  }
}

async function main() {
  const workspaceRoot = fullPath(takeFlag("--workspace-root") || repoRoot);
  ensureDirectory("Workspace root", workspaceRoot);

  const config = await readConfig(workspaceRoot);
  const sourceRoot = fullPath(
    takeFlag("--source-root") ||
      process.env.PLAN_WIKI_SOURCE_ROOT ||
      path.join(workspaceRoot, ".codex", "plan-wiki", "source")
  );
  const repo = takeFlag("--repo") || process.env.PLAN_WIKI_REPO || config.repo;
  const branch = takeFlag("--branch") || process.env.PLAN_WIKI_BRANCH || config.branch || "main";

  if (!existsSync(sourceRoot)) {
    if (!repo) {
      throw new Error("Plan wiki source is missing and no repo is configured. Set .codex/plan-wiki/config.json repo or pass --repo.");
    }
    runGit(["clone", "--branch", branch, repo, sourceRoot], workspaceRoot);
  }

  ensureGitRepo(sourceRoot);

  if (repo) {
    const remote = runGit(["remote", "get-url", "origin"], sourceRoot);
    if (remote !== repo) {
      throw new Error(`Plan wiki origin mismatch. Expected ${repo}, found ${remote}`);
    }
  }

  verifyPlanWiki(sourceRoot);

  const resolvedSourceRoot = await realpath(sourceRoot);
  console.log(`Prepared plan wiki source at ${resolvedSourceRoot}`);
  console.log(`Planning root: ${path.join(resolvedSourceRoot, "wiki")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
