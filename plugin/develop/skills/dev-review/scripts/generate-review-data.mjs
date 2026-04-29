#!/usr/bin/env node

// Deterministic generator for dev-review/review-data.json (schema v2).
//
// In v2 this script writes the FINAL review-data.json directly. There is no
// interpretation agent and no .partial.json intermediate. Every field is
// derived from git, the plan file (signature only), and discovered agent
// frontmatter.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { parseArgs, createLogger } from "./lib/args.mjs";
import {
  revParseHead,
  currentBranch,
  revParseSilent,
  listCommits,
  commitParent,
  commitNumstat,
  commitNameStatus,
  commitDiff,
} from "./lib/git.mjs";
import { readPlan } from "./lib/plan.mjs";
import { discoverAvailableAgents, defaultAgentsDirs } from "./lib/agents.mjs";
import { writeJsonAtomic, writeTextAtomic, ensureDir } from "./lib/output.mjs";

const SCHEMA_VERSION = 2;
const SHORT_SHA_LEN = 7;

function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    process.stderr.write(`[dev-review-gen] error ${err.message}\n`);
    process.exit(err.exitCode ?? 2);
  }

  const logger = createLogger(args.logLevel);

  try {
    run(args, logger);
  } catch (err) {
    logger.error(err.stack || err.message || String(err));
    process.exit(err.exitCode ?? 10);
  }
}

function run(args, logger) {
  const workspaceRoot = process.env.CLAUDE_WORKSPACE_ROOT || process.cwd();

  const planAbs = path.resolve(args.planPath);
  const worktreeAbs = path.resolve(args.worktree);
  const outAbs = path.resolve(args.out);
  const dataRootAbs = path.dirname(outAbs);
  const diffsDirAbs = path.resolve(
    args.diffsDir ?? path.join(dataRootAbs, "assets", "diffs"),
  );

  ensurePathExists(planAbs, "--plan-path", 4);
  ensurePathExists(worktreeAbs, "--worktree", 3);

  // One-time stale-schema cleanup: if a v1 (or older) review-data.json exists,
  // wipe the data folder before regenerating. v2-or-newer passes through.
  cleanupStaleSchema(dataRootAbs, logger);

  const plan = readPlan(planAbs);
  logger.info(`plan_signature=${plan.planSignature} branch_from_plan=${plan.branch ?? "(none)"}`);

  const taskHeadSha = revParseHead(worktreeAbs);
  const branchInWorktree = currentBranch(worktreeAbs);
  logger.info(`worktree=${worktreeAbs} task_head_sha=${taskHeadSha} branch=${branchInWorktree}`);

  if (branchInWorktree !== args.taskBranch) {
    logger.warn(
      `worktree branch ${branchInWorktree} does not match --task-branch ${args.taskBranch}; continuing`,
    );
  }

  if (!revParseSilent(worktreeAbs, args.base)) {
    const err = new Error(`base branch ${args.base} does not exist in the worktree`);
    err.exitCode = 3;
    throw err;
  }

  const commits = listCommits(worktreeAbs, args.base, taskHeadSha);
  if (commits.length === 0) {
    const err = new Error(`no commits in range ${args.base}..${taskHeadSha}`);
    err.exitCode = 3;
    throw err;
  }
  logger.info(`commits_in_range=${commits.length}`);

  ensureDir(diffsDirAbs);

  const commitObjects = [];
  const diffIndex = {};
  let totalAdditions = 0;
  let totalDeletions = 0;
  const allChangedPaths = new Set();

  for (let i = 0; i < commits.length; i += 1) {
    const meta = commits[i];
    const short = meta.sha.slice(0, SHORT_SHA_LEN);
    const parent = commitParent(worktreeAbs, meta.sha);

    let rawDiff = "";
    try {
      rawDiff = commitDiff(worktreeAbs, parent, meta.sha);
    } catch (err) {
      logger.warn(`diff failed for ${short}: ${err.message}`);
    }

    const diffFile = `${short}.diff`;
    const diffAbs = path.join(diffsDirAbs, diffFile);
    writeTextAtomic(diffAbs, rawDiff);
    diffIndex[short] = path.relative(dataRootAbs, diffAbs).split(path.sep).join("/");

    const nameStatus = commitNameStatus(worktreeAbs, meta.sha);
    const numstat = commitNumstat(worktreeAbs, meta.sha);

    const filesChanged = assembleFiles(nameStatus, numstat);

    let commitAdd = 0;
    let commitDel = 0;
    for (const f of filesChanged) {
      commitAdd += f.additions;
      commitDel += f.deletions;
      allChangedPaths.add(f.path);
    }
    totalAdditions += commitAdd;
    totalDeletions += commitDel;

    commitObjects.push({
      id: `C${i + 1}`,
      sha: meta.sha,
      short_sha: short,
      message_subject: meta.subject,
      message_body: meta.body,
      author: meta.author,
      author_email: meta.authorEmail,
      timestamp: meta.timestamp,
      additions: commitAdd,
      deletions: commitDel,
      files_changed: filesChanged,
      raw_diff_path: diffIndex[short],
    });
  }

  writeJsonAtomic(path.join(diffsDirAbs, "_index.json"), diffIndex);

  const agentDirs = args.availableAgentsDirs.length > 0
    ? args.availableAgentsDirs.map((d) => path.resolve(d))
    : defaultAgentsDirs(workspaceRoot);
  const availableAgents = discoverAvailableAgents(agentDirs, logger);
  logger.info(`available_agents=${availableAgents.length}`);

  const generatedAt = args.now ?? new Date().toISOString();
  const reviewData = {
    schema_version: SCHEMA_VERSION,
    task_slug: args.taskSlug,
    plan_path: toPosix(path.relative(workspaceRoot, planAbs)),
    plan_signature: plan.planSignature,
    base_branch: args.base,
    task_branch: args.taskBranch,
    task_head_sha: taskHeadSha,
    worktree_path: worktreeAbs,
    review_iteration: args.iteration,
    generated_at: generatedAt,
    available_agents: availableAgents,
    totals: {
      total_commits: commitObjects.length,
      total_files_changed: allChangedPaths.size,
      additions: totalAdditions,
      deletions: totalDeletions,
    },
    commits: commitObjects,
  };

  writeJsonAtomic(outAbs, reviewData);

  const sizeKb = Math.round(fs.statSync(outAbs).size / 1024);
  logger.info(
    `wrote ${toPosix(path.relative(workspaceRoot, outAbs))} (${sizeKb} KB) and ${commitObjects.length} diffs`,
  );
}

function cleanupStaleSchema(dataRootAbs, logger) {
  const reviewDataPath = path.join(dataRootAbs, "review-data.json");
  if (!fs.existsSync(reviewDataPath)) return;

  let existing;
  try {
    existing = JSON.parse(fs.readFileSync(reviewDataPath, "utf8"));
  } catch {
    // Unparsable JSON — treat as stale and wipe.
    logger.warn(`existing review-data.json unparsable, wiping data folder`);
    wipeDataFolder(dataRootAbs);
    return;
  }

  const existingVersion = existing?.schema_version ?? 1;
  if (existingVersion < SCHEMA_VERSION) {
    logger.warn(`stale schema_version=${existingVersion} detected, wiping data folder`);
    wipeDataFolder(dataRootAbs);
  }
}

function wipeDataFolder(dataRootAbs) {
  // Only delete files we know belong to dev-review. Never recurse into
  // unexpected siblings.
  for (const name of ["review-data.json", "feedback.json", "review-history.json"]) {
    const p = path.join(dataRootAbs, name);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
  const assetsDir = path.join(dataRootAbs, "assets");
  if (fs.existsSync(assetsDir)) {
    fs.rmSync(assetsDir, { recursive: true, force: true });
  }
}

function ensurePathExists(target, flag, exitCode) {
  if (!fs.existsSync(target)) {
    const err = new Error(`${flag} does not exist: ${target}`);
    err.exitCode = exitCode;
    throw err;
  }
}

function assembleFiles(nameStatus, numstat) {
  const byPath = new Map();
  for (const entry of nameStatus) {
    byPath.set(entry.path, {
      path: entry.path,
      kind: entry.kind,
      old_path: entry.oldPath ?? null,
      additions: 0,
      deletions: 0,
      binary: false,
    });
  }

  for (const entry of numstat) {
    const filePath = normalizeNumstatPath(entry.rawPath);
    const isBinary = entry.rawAdditions === "-" && entry.rawDeletions === "-";
    const row = byPath.get(filePath) || {
      path: filePath,
      kind: "modified",
      old_path: null,
      additions: 0,
      deletions: 0,
      binary: false,
    };
    row.additions = entry.additions;
    row.deletions = entry.deletions;
    row.binary = isBinary;
    byPath.set(filePath, row);
  }

  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeNumstatPath(rawPath) {
  if (!rawPath) return rawPath;
  const braceMatch = rawPath.match(/^(.*)\{.*=>\s*(.*?)\}(.*)$/);
  if (braceMatch) {
    return `${braceMatch[1]}${braceMatch[2]}${braceMatch[3]}`.replace(/\/+/g, "/");
  }
  const arrowMatch = rawPath.match(/(.*?)\s*=>\s*(.*)/);
  if (arrowMatch) return arrowMatch[2];
  return rawPath;
}

function toPosix(filePath) {
  return String(filePath).split(path.sep).join("/");
}

main();
