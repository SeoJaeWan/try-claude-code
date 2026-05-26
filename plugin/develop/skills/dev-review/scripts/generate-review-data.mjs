#!/usr/bin/env node

// dev-review/review-data.json 의 결정적(deterministic) 생성기 (스키마 v2).
//
// v2 에서는 헬퍼가 최종 review-data.json 을 직접 기록한다. 해석 에이전트도
// 없고, .partial.json 중간 산출물도 없다. 모든 필드는 git, plan 파일(시그니처
// 용도로만), 발견된 에이전트 frontmatter 와 — runner-state 마이그레이션 이후
// 부터는 — `--state-path` 로 전달받은 plan-state JSON 으로부터 도출된다.
//
// CLI 형태:
//   --state-path <abs path>     필수. plan-state JSON 으로부터
//                               plan_slug / plan_path / worktree_path /
//                               base_branch / task_branch 를 공급받는다.
//   --out <abs path>            선택. 생략 시
//                               `{state-dir}/dev-review/review-data.json`.
//   --diffs-dir <abs path>      선택. 생략 시 `{out-dir}/assets/diffs/`.
//   --available-agents-dir ...  선택, 반복 가능.
//   --log-level / --now         선택.

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
import { loadState } from "../../../scripts/lib/runner-state.mjs";

const SCHEMA_VERSION = 2;
const SHORT_SHA_LEN = 7;

/**
 * CLI 진입점. 인자 파싱 실패는 exitCode=2, 실행 단계 실패는 exitCode=10
 * 으로 종료한다(각 단계별 에러는 별도 exitCode 를 자체적으로 설정한다).
 */
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

/**
 * 실제 review-data.json 생성 로직. plan-state 를 로드해 모든 입력 경로를
 * 도출한 뒤, base..head 범위의 커밋·diff·numstat 을 모아 v2 review 객체를
 * 만들어 원자적으로 기록한다.
 *
 * @param {object} args - parseArgs 결과.
 * @param {{error: Function, warn: Function, info: Function, debug: Function}} logger - 로거.
 */
function run(args, logger) {
  const workspaceRoot = process.env.CLAUDE_WORKSPACE_ROOT || process.cwd();

  // plan 단위 입력은 모두 plan-state JSON 에서 도출한다.
  const statePathAbs = path.resolve(args.statePath);
  ensurePathExists(statePathAbs, "--state-path", 2);

  let state;
  try {
    state = loadState(statePathAbs);
  } catch (err) {
    const wrapped = new Error(`failed to load plan-state: ${err.message}`);
    wrapped.exitCode = 2;
    throw wrapped;
  }

  const planAbs = path.resolve(state.plan_path);
  const worktreeAbs = path.resolve(state.worktree_path);
  const stateDir = path.dirname(statePathAbs);
  const outAbs = path.resolve(
    args.out ?? path.join(stateDir, "dev-review", "review-data.json"),
  );
  const dataRootAbs = path.dirname(outAbs);
  const diffsDirAbs = path.resolve(
    args.diffsDir ?? path.join(dataRootAbs, "assets", "diffs"),
  );

  const taskSlug = state.plan_slug;
  const baseBranch = state.base_branch;
  const taskBranch = state.task_branch;

  ensurePathExists(planAbs, "state.plan_path", 4);
  ensurePathExists(worktreeAbs, "state.worktree_path", 3);

  // 1회성 stale-schema 정리: v1(이전 버전) review-data.json 이 있으면 데이터
  // 폴더를 지우고 재생성한다. v2 이상은 그대로 통과한다.
  cleanupStaleSchema(dataRootAbs, logger);

  const plan = readPlan(planAbs);
  logger.info(`plan_signature=${plan.planSignature} branch_from_plan=${plan.branch ?? "(none)"}`);

  const taskHeadSha = revParseHead(worktreeAbs);
  const branchInWorktree = currentBranch(worktreeAbs);
  logger.info(`worktree=${worktreeAbs} task_head_sha=${taskHeadSha} branch=${branchInWorktree}`);

  if (branchInWorktree !== taskBranch) {
    logger.warn(
      `worktree branch ${branchInWorktree} does not match state.task_branch ${taskBranch}; continuing`,
    );
  }

  if (!revParseSilent(worktreeAbs, baseBranch)) {
    const err = new Error(`base branch ${baseBranch} does not exist in the worktree`);
    err.exitCode = 3;
    throw err;
  }

  const commits = listCommits(worktreeAbs, baseBranch, taskHeadSha);
  if (commits.length === 0) {
    const err = new Error(`no commits in range ${baseBranch}..${taskHeadSha}`);
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
    task_slug: taskSlug,
    plan_path: toPosix(path.relative(workspaceRoot, planAbs)),
    plan_signature: plan.planSignature,
    base_branch: baseBranch,
    task_branch: taskBranch,
    task_head_sha: taskHeadSha,
    worktree_path: worktreeAbs,
    state_path: toPosix(path.relative(workspaceRoot, statePathAbs)),
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

/**
 * 이전 스키마 버전(v1)의 review-data.json 이 있으면 데이터 폴더를 지운다.
 * 파싱이 안 되는 파일도 stale 로 간주해 정리한다.
 *
 * @param {string} dataRootAbs - 데이터 루트 절대 경로.
 * @param {{warn: Function}} logger - 로거.
 */
function cleanupStaleSchema(dataRootAbs, logger) {
  const reviewDataPath = path.join(dataRootAbs, "review-data.json");
  if (!fs.existsSync(reviewDataPath)) return;

  let existing;
  try {
    existing = JSON.parse(fs.readFileSync(reviewDataPath, "utf8"));
  } catch {
    // 파싱 불가 — stale 로 간주하고 폴더를 지운다.
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

/**
 * dev-review 가 소유한 파일들만 골라서 삭제한다. 예상치 못한 형제 파일을
 * 재귀 삭제하지 않는다.
 *
 * @param {string} dataRootAbs - 데이터 루트 절대 경로.
 */
function wipeDataFolder(dataRootAbs) {
  for (const name of ["review-data.json", "feedback.json", "review-history.json"]) {
    const p = path.join(dataRootAbs, name);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
  const assetsDir = path.join(dataRootAbs, "assets");
  if (fs.existsSync(assetsDir)) {
    fs.rmSync(assetsDir, { recursive: true, force: true });
  }
}

/**
 * 경로가 존재하지 않으면 exitCode 가 부착된 Error 를 던진다.
 *
 * @param {string} target - 존재 여부를 확인할 경로.
 * @param {string} flag - 에러 메시지에 표시할 플래그/필드명.
 * @param {number} exitCode - 던질 Error 에 부착할 종료 코드.
 */
function ensurePathExists(target, flag, exitCode) {
  if (!fs.existsSync(target)) {
    const err = new Error(`${flag} does not exist: ${target}`);
    err.exitCode = exitCode;
    throw err;
  }
}

/**
 * name-status 와 numstat 결과를 path 기준으로 병합해 files_changed 배열을
 * 만든다. 바이너리 파일은 binary=true 로 표시되고 additions/deletions=0 이다.
 *
 * @param {Array<object>} nameStatus - commitNameStatus 결과.
 * @param {Array<object>} numstat - commitNumstat 결과.
 * @returns {Array<{path: string, kind: string, old_path: string|null, additions: number, deletions: number, binary: boolean}>}
 */
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

/**
 * git --numstat 의 이름 변경 표기("old => new", "dir/{a => b}/file")를
 * 새 이름 경로로 정규화한다.
 *
 * @param {string} rawPath - git 이 반환한 raw 경로.
 * @returns {string} 정규화된 경로.
 */
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

/**
 * OS 경로 구분자를 POSIX 슬래시로 변환한다.
 *
 * @param {string} filePath - 변환할 경로.
 * @returns {string} POSIX 형식 경로.
 */
function toPosix(filePath) {
  return String(filePath).split(path.sep).join("/");
}

main();
