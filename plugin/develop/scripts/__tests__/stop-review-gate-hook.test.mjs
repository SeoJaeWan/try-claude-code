import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  STATUS,
  STOP_REVIEW_PHASE,
  createInitialState,
  recordPlanBlock,
  saveState,
  setLastReviewedCommit,
  setStopReviewArmed,
  setStopReviewPhase,
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
// We also create a `main` ref pointing at the same seed commit so the new
// merge-base lookup path resolves (`git merge-base main HEAD` → seed).
function makeFakeWorktree(name) {
  const wt = path.join(projectRoot, "worktrees", name);
  fs.mkdirSync(wt, { recursive: true });
  spawnSync("git", ["-C", wt, "init", "-q", "-b", name], { stdio: "ignore" });
  spawnSync("git", ["-C", wt, "config", "user.email", "t@t"], { stdio: "ignore" });
  spawnSync("git", ["-C", wt, "config", "user.name", "t"], { stdio: "ignore" });
  fs.writeFileSync(path.join(wt, "x.txt"), "x");
  spawnSync("git", ["-C", wt, "add", "-A"], { stdio: "ignore" });
  spawnSync("git", ["-C", wt, "commit", "-q", "-m", "seed"], { stdio: "ignore" });
  // Mirror the seed commit on a `main` ref so collectDiffForPlan's merge-base
  // resolution succeeds. Without this, the new diff-base logic would fail
  // (no `main` ref) and the hook would skip silently — masking what we are
  // trying to test.
  spawnSync("git", ["-C", wt, "branch", "main"], { stdio: "ignore" });
  const head = spawnSync(
    "git",
    ["-C", wt, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).stdout.trim();
  return { wt, head };
}

// Add a fresh commit on top of the current branch and return its SHA. Lets
// tests put a "task branch with one agent commit" state on disk.
function addCommit(wt, message, filename) {
  fs.writeFileSync(path.join(wt, filename), `content-${Date.now()}`);
  spawnSync("git", ["-C", wt, "add", "-A"], { stdio: "ignore" });
  spawnSync("git", ["-C", wt, "commit", "-q", "-m", message], { stdio: "ignore" });
  return spawnSync(
    "git",
    ["-C", wt, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).stdout.trim();
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
  // Walk to DISPATCHING + phase=BLOCKED (v2 equivalent of v1's
  // STOP_REVIEW_BLOCKED).
  transitionStatus(state, STATUS.DISPATCHING);
  setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
  setStopReviewPhase(state, STOP_REVIEW_PHASE.BLOCKED);
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
      cwd: projectRoot,
      activePlan: statePath.replace(/\\/g, "/"),
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
  it("emits a systemMessage when DISPATCHING+BLOCKED has no new commits", () => {
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

  // Regression for the bug that caused the dev_reviewing deadlock:
  //   - last_reviewed_commit = null (first stop-hook firing)
  //   - worktree HEAD = base branch tip (agent has not committed yet)
  // Pre-fix, the hook fell back to `HEAD~1..HEAD` and reviewed the base
  // branch's previous commit as if it were plan work, earning an ALLOW and
  // walking state to dev_reviewing. Post-fix, the diff-base is resolved via
  // `git merge-base main HEAD` = HEAD, so collectDiffForPlan returns null
  // and the new armed-empty surface prints a hint instead of advancing.
  it("surfaces armed-empty hint when DISPATCHING+ARMED has no agent commits yet", () => {
    const sessionId = `sess-armed-empty-${++counter}`;
    counter += 1;
    const slug = `armed-empty-${counter}`;
    const branch = `feat/${slug}`;
    const { wt } = makeFakeWorktree(branch);

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
    setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
    setStopReviewArmed(state, true);
    // Crucially leave last_reviewed_commit = null — that is the broken-fallback
    // entry point. saveState as-is.
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
    const lines = r.stdout.split(/\r?\n/).filter(Boolean);
    const messages = lines
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    // No decision:block (the bug used to walk state via a fake ALLOW; the
    // fix must emit only a systemMessage and not advance state).
    assert.equal(messages.find((m) => m.decision === "block"), undefined);
    const sysMsg = messages.find((m) => m.systemMessage);
    assert.ok(sysMsg, `expected armed-empty systemMessage; got: ${r.stdout}`);
    assert.match(sysMsg.systemMessage, /dispatch.*새 commit 없음/);
    assert.match(sysMsg.systemMessage, new RegExp(slug));

    // State must be unchanged — still dispatching/armed with no last_reviewed.
    const finalState = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.equal(finalState.status, "dispatching");
    assert.equal(finalState.stop_review.phase, "armed");
    assert.equal(finalState.stop_review.armed, true);
    assert.equal(finalState.stop_review.last_reviewed_commit, null);
  });

  // Regression for the cookbook silent-stall: the runner's UserPromptSubmit
  // hook did not fire (plugin re-bind delay between turns), Claude manually
  // bootstrapped with a placeholder session id, and so the real session's
  // activePlanStates never got the pointer. Pre-fix, the Stop hook keyed off
  // activePlanStates and returned silently with disk-armed state never seen.
  // Post-fix, the hook globs plans/ and discovers the armed plan regardless
  // of session.json contents.
  it("finds armed plan via disk glob even when session.json has no pointer", () => {
    const sessionId = `sess-disk-only-${++counter}`;
    const { slug } = makeStuckPlan({ sessionId });

    // Overwrite session.json so its activePlan slot is intentionally empty —
    // same shape as the cookbook regression where setActivePlan silently
    // failed.
    const sessionsDir = path.join(pluginDataDir, "sessions");
    fs.writeFileSync(
      path.join(sessionsDir, `${sessionId}.json`),
      JSON.stringify({
        sessionId,
        cwd: projectRoot,
        activePlan: null,
        stopReviewThreadId: null,
      }, null, 2),
    );

    const r = runHook({ sessionId });
    assert.equal(r.status, 0, r.stderr);
    const lines = r.stdout.split(/\r?\n/).filter(Boolean);
    const messages = lines
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    const sysMsg = messages.find((m) => m.systemMessage);
    assert.ok(sysMsg, `expected systemMessage from disk discovery; got: ${r.stdout}`);
    assert.match(sysMsg.systemMessage, new RegExp(slug));
  });

  // The session.json absence case is even harder than the empty-pointer
  // case: SessionStart hook never fired (fresh plugin install, sandboxed
  // workspace, etc.). Stop hook should still discover armed plans via the
  // disk glob and proceed.
  it("finds armed plan via disk glob even when session.json does not exist", () => {
    const sessionId = `sess-no-json-${++counter}`;
    const { slug } = makeStuckPlan({ sessionId });

    // Delete the session.json that makeStuckPlan created for us.
    const sessionFile = path.join(pluginDataDir, "sessions", `${sessionId}.json`);
    try { fs.unlinkSync(sessionFile); } catch {}

    const r = runHook({ sessionId });
    assert.equal(r.status, 0, r.stderr);
    const lines = r.stdout.split(/\r?\n/).filter(Boolean);
    const messages = lines
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    const sysMsg = messages.find((m) => m.systemMessage);
    assert.ok(sysMsg, `expected systemMessage from disk discovery; got: ${r.stdout}`);
    assert.match(sysMsg.systemMessage, new RegExp(slug));
  });

  // Multi-session isolation: a Stop hook firing in session A should not pick
  // up session B's armed plan. state.session_id filters cross-session.
  it("filters out armed plans owned by a different session_id", () => {
    const sessionAId = `sess-A-${++counter}`;
    const sessionBId = `sess-B-${++counter}`;
    // Plan owned by session B.
    makeStuckPlan({ sessionId: sessionBId });

    // Run hook as session A (no plans owned).
    const r = runHook({ sessionId: sessionAId });
    assert.equal(r.status, 0, r.stderr);
    // Should be silent — session B's plan is not session A's concern.
    assert.equal(r.stdout.trim(), "", `expected silent; got: ${r.stdout}`);
  });

  it("stays silent when the only armed plan is DISPATCHING+ARMED with nothing new", () => {
    // Same shape as above but stop_review.phase is ARMED — the canonical
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
    setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
    setStopReviewArmed(state, true);
    setLastReviewedCommit(state, head, "ALLOW");
    saveState(statePath, state);

    const sessionsDir = path.join(pluginDataDir, "sessions");
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsDir, `${sessionId}.json`),
      JSON.stringify({
        sessionId,
        cwd: projectRoot,
        activePlan: statePath.replace(/\\/g, "/"),
        stopReviewThreadId: null,
      }, null, 2),
    );

    const r = runHook({ sessionId });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), "", "expected silent return for non-blocked armed plan");
  });

  // Pins the early-exit behavior: when no armed plan exists on disk, the
  // Stop hook does not consult session.json at all. A corrupt session file
  // from an unrelated cause (manual edit, half-write) must not gate a
  // runner-unrelated turn.
  it("stays silent on a corrupt session.json when no armed plans exist", () => {
    const sessionId = `sess-passthrough-${++counter}`;
    // Write a corrupt session file (invalid JSON) under the plugin data dir.
    const sessionsDir = path.join(pluginDataDir, "sessions");
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsDir, `${sessionId}.json`),
      "{ not valid json",
      "utf8",
    );
    // No armed plans in plans/ — the hook should short-circuit and never
    // touch the corrupt file.

    const r = runHook({ sessionId });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      r.stdout.trim(),
      "",
      "expected silent return — no armed plan, corrupt session must not gate",
    );
  });
});
