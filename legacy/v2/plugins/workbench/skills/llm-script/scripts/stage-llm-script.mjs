#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync
} from "node:fs";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_REPO = "https://github.com/SeoJaeWan/llm-script.git";
const DEFAULT_BRANCH = "main";
const DEFAULT_MAX_SOURCE_BYTES = 128 * 1024;

function usage() {
  return [
    "Usage: node <llm-script-skill-dir>/scripts/stage-llm-script.mjs --workspace-root <path> [options]",
    "",
    "Options:",
    "  --llm-script-root <path>  Collection root (default: ${CODEX_HOME:-~/.codex}/workbench/llm-script)",
    "  --project <name>          Project label (default: package name or workspace directory name)",
    `  --repo <git-url>          Collection repository (default: ${DEFAULT_REPO})`,
    `  --branch <name>           Branch cloned on first setup (default: ${DEFAULT_BRANCH})`,
    "  -h, --help                Show this help"
  ].join("\n");
}

function parseArgs(values) {
  const options = {};
  const supported = new Map([
    ["--workspace-root", "workspaceRoot"],
    ["--llm-script-root", "llmScriptRoot"],
    ["--project", "project"],
    ["--repo", "repo"],
    ["--branch", "branch"]
  ]);

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--help" || value === "-h") {
      options.help = true;
      continue;
    }

    const key = supported.get(value);
    if (!key) {
      throw new Error(`Unknown option: ${value}`);
    }

    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${value}`);
    }
    options[key] = next;
    index += 1;
  }

  return options;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortedEntries(value) {
  return Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
}

function defaultLlmScriptRoot() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return path.resolve(codexHome, "workbench", "llm-script");
}

function ensureDirectory(label, value) {
  if (!existsSync(value) || !statSync(value).isDirectory()) {
    throw new Error(`${label} not found: ${value}`);
  }
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.error) {
    throw new Error(`Unable to run git: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
    throw new Error(`git ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }

  return result.stdout.trim();
}

async function readJsonIfExists(filePath, fallback) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }

  try {
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
    if (!isRecord(parsed)) {
      throw new Error("expected a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON at ${filePath}: ${error.message}`);
  }
}

async function writeJsonIfChanged(filePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    if ((await readFile(filePath, "utf8")) === content) return false;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, content, "utf8");
    await rename(temporaryPath, filePath);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  return true;
}

function readPackageName(workspaceRoot) {
  const packagePath = path.join(workspaceRoot, "package.json");
  if (!existsSync(packagePath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8").replace(/^\uFEFF/, ""));
    if (typeof pkg.name !== "string" || !pkg.name.trim()) return null;
    return pkg.name.trim().split("/").pop();
  } catch {
    return null;
  }
}

function normalizeProject(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Project name is required.");
  }
  const project = value.trim();
  if (/[\u0000-\u001f\u007f]/u.test(project)) {
    throw new Error("Project name must not contain control characters.");
  }
  return project;
}

function normalizeRemote(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/]+$/u, "")
    .replace(/\.git$/u, "");
}

function validateRepository(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Repository URL is required.");
  }
  const repo = value.trim();
  if (/[\u0000-\u001f\u007f]/u.test(repo)) {
    throw new Error("Repository URL must not contain control characters.");
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(repo)) {
    let parsed;
    try {
      parsed = new URL(repo);
    } catch {
      throw new Error("Repository URL is invalid.");
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("Repository URL must not contain credentials, query parameters, or a fragment.");
    }
  }
  return repo;
}

function verifySource(sourceRoot, expectedRepo, expectedBranch) {
  ensureDirectory("LLM script source root", sourceRoot);

  const inside = runGit(["rev-parse", "--is-inside-work-tree"], sourceRoot);
  if (inside !== "true") {
    throw new Error(`LLM script source is not a Git worktree: ${sourceRoot}`);
  }

  const topLevel = realpathSync(runGit(["rev-parse", "--show-toplevel"], sourceRoot));
  const canonicalSource = realpathSync(sourceRoot);
  if (topLevel !== canonicalSource) {
    throw new Error(`LLM script source is not the Git worktree root: ${sourceRoot}`);
  }

  const remote = runGit(["remote", "get-url", "origin"], sourceRoot);
  if (normalizeRemote(remote) !== normalizeRemote(expectedRepo)) {
    throw new Error(`LLM script origin mismatch. Expected ${expectedRepo}, found ${remote}`);
  }

  const branch = runGit(["branch", "--show-current"], sourceRoot);
  if (branch !== expectedBranch) {
    throw new Error(
      `LLM script branch mismatch. Expected ${expectedBranch}, found ${branch || "detached HEAD"}`
    );
  }

  return {
    branch,
    status: runGit(["--no-optional-locks", "status", "--short"], sourceRoot)
  };
}

function buildConfig(existing, repo, branch) {
  const {
    schemaVersion: _schemaVersion,
    repo: _repo,
    branch: _branch,
    enabled: _enabled,
    maxSourceBytes,
    ...extra
  } = existing;

  return {
    schemaVersion: 1,
    repo,
    branch,
    enabled: true,
    maxSourceBytes: Object.hasOwn(existing, "maxSourceBytes")
      ? maxSourceBytes
      : DEFAULT_MAX_SOURCE_BYTES,
    ...Object.fromEntries(sortedEntries(extra))
  };
}

function buildWorkspaceIndex(existing, workspaceRoot, project) {
  const existingWorkspaces = isRecord(existing.workspaces) ? existing.workspaces : {};
  const previous = isRecord(existingWorkspaces[workspaceRoot])
    ? existingWorkspaces[workspaceRoot]
    : {};
  const { project: _project, capture: _capture, ...entryExtra } = previous;
  const workspaces = {
    ...existingWorkspaces,
    [workspaceRoot]: {
      project,
      capture: true,
      ...Object.fromEntries(sortedEntries(entryExtra))
    }
  };
  const { workspaces: _workspaces, ...topLevelExtra } = existing;

  return {
    workspaces: Object.fromEntries(sortedEntries(workspaces)),
    ...Object.fromEntries(sortedEntries(topLevelExtra))
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.workspaceRoot) {
    throw new Error("--workspace-root is required.");
  }

  const requestedWorkspace = path.resolve(options.workspaceRoot);
  ensureDirectory("Workspace root", requestedWorkspace);
  const workspaceRoot = realpathSync(requestedWorkspace);
  const llmScriptRoot = path.resolve(options.llmScriptRoot || defaultLlmScriptRoot());
  const configPath = path.join(llmScriptRoot, "config.json");
  const workspacesPath = path.join(llmScriptRoot, "workspaces.json");
  const sourceRoot = path.join(llmScriptRoot, "source");

  const existingConfig = await readJsonIfExists(configPath, {});
  const existingWorkspaceIndex = await readJsonIfExists(workspacesPath, { workspaces: {} });
  const existingWorkspace = isRecord(existingWorkspaceIndex.workspaces?.[workspaceRoot])
    ? existingWorkspaceIndex.workspaces[workspaceRoot]
    : {};

  const repo = validateRepository(options.repo || existingConfig.repo || DEFAULT_REPO);
  const branch = options.branch || existingConfig.branch || DEFAULT_BRANCH;
  const project = normalizeProject(
    options.project ||
      existingWorkspace.project ||
      readPackageName(workspaceRoot) ||
      path.basename(workspaceRoot)
  );

  if (typeof branch !== "string" || !branch.trim()) {
    throw new Error("Branch name is required.");
  }

  mkdirSync(llmScriptRoot, { recursive: true });
  if (!existsSync(sourceRoot)) {
    runGit(["clone", "--branch", branch, "--", repo, sourceRoot], llmScriptRoot);
  }
  const sourceState = verifySource(sourceRoot, repo, branch);

  const configChanged = await writeJsonIfChanged(
    configPath,
    buildConfig(existingConfig, repo, branch)
  );
  const workspacesChanged = await writeJsonIfChanged(
    workspacesPath,
    buildWorkspaceIndex(existingWorkspaceIndex, workspaceRoot, project)
  );

  console.log(`LLM script root: ${llmScriptRoot}`);
  console.log(`Source clone: ${realpathSync(sourceRoot)}`);
  console.log(`Branch: ${sourceState.branch}`);
  console.log(`Workspace mapping: ${workspaceRoot} -> ${project}`);
  console.log(`Metadata: ${configChanged || workspacesChanged ? "updated" : "unchanged"}`);
  console.log(`Nested repo status:${sourceState.status ? `\n${sourceState.status}` : " clean"}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
