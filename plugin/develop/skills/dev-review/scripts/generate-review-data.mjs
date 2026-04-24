#!/usr/bin/env node

// Deterministic generator for dev-review/review-data.partial.json.
//
// This script owns every field that can be derived from git, the plan file,
// the QA report, and prior review artifacts. It never produces interpretive
// content (card titles, descriptions, plan-vs-result judgments, deviations,
// natural-language test assertions). Those belong to the interpretation
// agent invoked by the dev-review skill.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
  rangeNameStatus,
  rangeNumstat,
} from "./lib/git.mjs";
import { parseUnifiedDiff } from "./lib/diff.mjs";
import { readPlan } from "./lib/plan.mjs";
import { discoverAvailableAgents, defaultAgentsDirs } from "./lib/agents.mjs";
import { buildFallbackCards } from "./lib/fallback.mjs";
import { classifyTrack, emptyChangeMap, mergeChangeMap, compactChangeMap } from "./lib/track.mjs";
import { readPriorHistory, computeAddressed } from "./lib/history.mjs";
import { writeJsonAtomic, writeTextAtomic, ensureDir } from "./lib/output.mjs";

const SCHEMA_VERSION = 1;
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
  const diffsDirAbs = path.resolve(
    args.diffsDir ?? path.join(path.dirname(outAbs), "assets", "diffs"),
  );

  ensurePathExists(planAbs, "--plan-path", 4);
  ensurePathExists(worktreeAbs, "--worktree", 3);

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
    diffIndex[short] = path.relative(path.dirname(outAbs), diffAbs).split(path.sep).join("/");

    const parsedFiles = safeParse(rawDiff, logger, short);
    const nameStatus = commitNameStatus(worktreeAbs, meta.sha);
    const numstat = commitNumstat(worktreeAbs, meta.sha);

    const files_changed = assembleFiles(parsedFiles, nameStatus, numstat);
    const totals = files_changed.reduce(
      (acc, f) => ({
        additions: acc.additions + (f.additions || 0),
        deletions: acc.deletions + (f.deletions || 0),
      }),
      { additions: 0, deletions: 0 },
    );

    const commitObj = {
      id: `C${i + 1}`,
      sha: meta.sha,
      short_sha: short,
      message_subject: meta.subject,
      message_body: meta.body,
      author: meta.author,
      author_email: meta.authorEmail,
      timestamp: meta.timestamp,
      additions: totals.additions,
      deletions: totals.deletions,
      files_changed,
      cards: [],
      tests_added: [],
      deviations: [],
      addressed_by_this_commit: [],
      raw_diff_path: diffIndex[short],
    };

    commitObj._fallback_cards = buildFallbackCards(commitObj, worktreeAbs);

    commitObjects.push(commitObj);
  }

  writeJsonAtomic(path.join(diffsDirAbs, "_index.json"), diffIndex);

  const rangeFiles = rangeNumstat(worktreeAbs, args.base, taskHeadSha);
  const changeMap = emptyChangeMap();
  for (const file of rangeFiles) mergeChangeMap(changeMap, file);

  const totalFilesChanged = rangeFiles.length;
  const mergeImpact = rangeNameStatus(worktreeAbs, args.base, taskHeadSha).map(
    (entry) => ({ path: entry.path, kind: entry.kind }),
  );

  const agentDirs = args.availableAgentsDirs.length > 0
    ? args.availableAgentsDirs.map((d) => path.resolve(d))
    : defaultAgentsDirs(workspaceRoot);
  const availableAgents = discoverAvailableAgents(agentDirs, logger);
  logger.info(`available_agents=${availableAgents.length}`);

  const priorHistory = readPriorHistory(args.priorHistory || "");
  if (priorHistory) {
    computeAddressed(priorHistory, commitObjects);
  }

  const generatedAt = args.now ?? new Date().toISOString();
  const partial = {
    schema_version: SCHEMA_VERSION,
    task_slug: args.taskSlug,
    plan_path: toPosix(path.relative(workspaceRoot, planAbs)),
    plan_signature: plan.planSignature,
    base_branch: args.base,
    task_branch: args.taskBranch,
    task_head_sha: taskHeadSha,
    review_iteration: args.iteration,
    generated_at: generatedAt,
    available_agents: availableAgents,
    overview: {
      user_request: plan.userRequest,
      plan_summary: plan.planSummary,
      change_map: compactChangeMap(changeMap),
      total_commits: commitObjects.length,
      total_files_changed: totalFilesChanged,
      plan_vs_result: [],
      deviations_summary: [],
      open_risks: [],
      interpretation_skipped: false,
    },
    commits: commitObjects,
    final: {
      commit_log: commitObjects.map((c) => ({
        short_sha: c.short_sha,
        subject: c.message_subject,
        author: c.author,
        timestamp: c.timestamp,
      })),
      merge_impact: mergeImpact,
    },
  };

  writeJsonAtomic(outAbs, partial);

  const sizeKb = Math.round(fs.statSync(outAbs).size / 1024);
  logger.info(
    `wrote ${toPosix(path.relative(workspaceRoot, outAbs))} (${sizeKb} KB) and ${commitObjects.length} diffs`,
  );
}

function ensurePathExists(target, flag, exitCode) {
  if (!fs.existsSync(target)) {
    const err = new Error(`${flag} does not exist: ${target}`);
    err.exitCode = exitCode;
    throw err;
  }
}

function safeParse(rawDiff, logger, short) {
  try {
    return parseUnifiedDiff(rawDiff);
  } catch (err) {
    logger.warn(`diff parse failed for ${short}: ${err.message}`);
    return [];
  }
}

function assembleFiles(parsedFiles, nameStatus, numstat) {
  const byPath = new Map();
  for (const entry of nameStatus) {
    byPath.set(entry.path, {
      path: entry.path,
      kind: entry.kind,
      old_path: entry.oldPath ?? null,
      additions: 0,
      deletions: 0,
      diff_hunks: [],
    });
  }

  for (const entry of numstat) {
    const path = normalizeNumstatPath(entry.rawPath);
    const row = byPath.get(path) || {
      path,
      kind: "modified",
      old_path: null,
      additions: 0,
      deletions: 0,
      diff_hunks: [],
    };
    row.additions = entry.additions;
    row.deletions = entry.deletions;
    byPath.set(path, row);
  }

  for (const parsed of parsedFiles) {
    const row = byPath.get(parsed.path) || {
      path: parsed.path,
      kind: "modified",
      old_path: parsed.oldPath ?? null,
      additions: 0,
      deletions: 0,
      diff_hunks: [],
    };
    row.diff_hunks = parsed.diff_hunks;
    if (!row.old_path && parsed.oldPath) row.old_path = parsed.oldPath;
    byPath.set(parsed.path, row);
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
