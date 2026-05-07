import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  STATUS,
  createInitialState,
  recordPlanBlock,
  saveState,
  setLastReviewedCommit,
  setStopReviewArmed,
  transitionStatus,
} from "../lib/runner-state.mjs";

// Stop hook integration test for the "BLOCK 상태 유지 + 새 commit 없음" surface
// added in Phase 3-A. Pre-Phase-3, the hook returned silently when collectDiff
// produced no review items — leaving the user with a quiet turn while the plan
// stayed wedged in stop_review_blocked.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(SCRIPT_DIR, "..", "stop-review-gate-hook.mjs");

let tmpRoot;
let projectRoot;
let pluginDataDir;

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stop-hook-test-"));

  projectRoot = path.join(tmpRoot, "project");
  fs.mkdirSync(projectRoot, { recursive: true });
  spawnSync("git", ["-C", projectRoot, "init", "-q", "-b", "main"], {
    stdio: "ignore",
  });

  pluginDataDir = path.join(tmpRoot, "plugin-data");
  fs.mkdirSync(pluginDataDir, { recursive: true });
});

after(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

let counter = 0;

// Build a real git "worktree" directory (just a git repo for our purposes —
// the Stop hook only ever calls `git rev-parse HEAD` and `git diff` against
// the path stored in state.worktree_path, so an init + single commit is
// enough to drive the collectDiffForPlan branches deterministically).
function makeFakeWorktree(name) {
  const wt = path.join(projectRoot, "worktrees", name);
  fs.mkdirSync(wt, { recursive: true });
  spawnSync("git", ["-C", wt, "init", "-q", "-b", name], { stdio: "ignore" });
  spawnSync("git", ["-C", wt, "config", "user.email", "t@t"], { stdio: "ignore" });
  spawnSync("git", ["-C", wt, "config", "user.name", "t"], { stdio: "ignore" });
  fs.writeFileSync(path.join(wt, "x.txt"), "x");
  spawnSync("git", ["-C", wt, "add", "-A"], { stdio: "ignore" });
  spawnSync("git", ["-C", wt, "commit", "-q", "-m", "seed"], { stdio: "ignore" });
  const head = spawnSync(
    "git",
    ["-C", wt, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).stdout.trim();
  return { wt, head };
}

function makeStuckPlan({ sessionId }) {
  counter += 1;
  const slug = `stuck-${counter}`;
  const branch = `feat/${slug}`;
  const { wt, head } = makeFakeWorktree(branch);

  const stateDir = path.join(projectRoot, "plans", slug);
  fs.mkdirSync(stateDir, { recursive: true });
  const statePath = path.join(stateDir, ".runner-state.json");

  const state = createInitialState({
    planSlug: slug,
    planPath: path.join(projectRoot, "plans", `${slug}.plan.md`),
    ownerAgent: "general-developer",
    baseBranch: "main",
    taskBranch: branch,
    worktreePath: wt,
    sessionId,
  });
  // Walk to STOP_REVIEW_BLOCKED.
  transitionStatus(state, STATUS.DISPATCHING);
  transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
  transitionStatus(state, STATUS.STOP_REVIEW_BLOCKED);
  setStopReviewArmed(state, true);
  // Record a BLOCK with a recognizable excerpt.
  recordPlanBlock(state, "BLOCK: simulated finding for the test\n[conf 9] reason");
  // Pin last_reviewed_commit to the current HEAD so collectDiffForPlan returns
  // null (the canonical "redispatch produced no commits" hang).
  setLastReviewedCommit(state, head, "BLOCK");
  saveState(statePath, state);

  // Register in session.
  const sessionsDir = path.join(pluginDataDir, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, `${sessionId}.json`),
    JSON.stringify({
      sessionId,
      createdAt: new Date().toISOString(),
      cwd: projectRoot,
      activePlanStates: [statePath],
      stopReviewThreadId: null,
    }, null, 2),
  );

  return { statePath, state, head, slug };
}

function runHook({ sessionId }) {
  const stdin = JSON.stringify({
    cwd: projectRoot,
    session_id: sessionId,
  });
  return spawnSync(process.execPath, [HOOK], {
    input: stdin,
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: projectRoot,
      CLAUDE_PLUGIN_DATA: pluginDataDir,
    },
  });
}

// ---------------------------------------------------------------------------

describe("Stop hook BLOCK-stuck surface", () => {
  it("emits a systemMessage when STOP_REVIEW_BLOCKED has no new commits", () => {
    const sessionId = `sess-stuck-${++counter}`;
    const { slug } = makeStuckPlan({ sessionId });
    const r = runHook({ sessionId });
    assert.equal(r.status, 0, r.stderr);
    // Hook may emit multiple JSON lines historically; the one we care about
    // is the systemMessage line. Find any line that parses as JSON with a
    // systemMessage field.
    const lines = r.stdout.split(/\r?\n/).filter(Boolean);
    const messages = lines
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    const sysMsg = messages.find((m) => m.systemMessage);
    assert.ok(sysMsg, `expected systemMessage; got: ${r.stdout}`);
    assert.match(sysMsg.systemMessage, /BLOCK 상태 유지/);
    assert.match(sysMsg.systemMessage, new RegExp(slug));
    assert.match(sysMsg.systemMessage, /simulated finding/);
    // No `decision: block` should be emitted in this branch.
    assert.equal(messages.find((m) => m.decision === "block"), undefined);
  });

  it("stays silent when the only armed plan is AWAITING_STOP_REVIEW with nothing new", () => {
    // Same shape as above but status is AWAITING_STOP_REVIEW — the canonical
    // "user sent a non-runner turn while armed" case. Hook should stay quiet.
    const sessionId = `sess-quiet-${++counter}`;
    counter += 1;
    const slug = `quiet-${counter}`;
    const branch = `feat/${slug}`;
    const { wt, head } = makeFakeWorktree(branch);

    const stateDir = path.join(projectRoot, "plans", slug);
    fs.mkdirSync(stateDir, { recursive: true });
    const statePath = path.join(stateDir, ".runner-state.json");
    const state = createInitialState({
      planSlug: slug,
      planPath: path.join(projectRoot, "plans", `${slug}.plan.md`),
      ownerAgent: "general-developer",
      baseBranch: "main",
      taskBranch: branch,
      worktreePath: wt,
      sessionId,
    });
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
    setStopReviewArmed(state, true);
    setLastReviewedCommit(state, head, "ALLOW");
    saveState(statePath, state);

    const sessionsDir = path.join(pluginDataDir, "sessions");
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsDir, `${sessionId}.json`),
      JSON.stringify({
        sessionId,
        createdAt: new Date().toISOString(),
        cwd: projectRoot,
        activePlanStates: [statePath],
        stopReviewThreadId: null,
      }, null, 2),
    );

    const r = runHook({ sessionId });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), "", "expected silent return for non-blocked armed plan");
  });
});
