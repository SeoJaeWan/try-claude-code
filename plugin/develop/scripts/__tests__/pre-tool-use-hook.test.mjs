import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  DEV_REVIEW_PHASE,
  STATUS,
  STOP_REVIEW_PHASE,
  createInitialState,
  loadState,
  saveState,
  setDevReviewPhase,
  setStopReviewArmed,
  setStopReviewPhase,
  transitionStatus,
} from "../lib/runner-state.mjs";

// Spawn-based integration tests for the PreToolUse hook. We synthesize a
// session JSON (with one active plan-state pointer), feed the hook a
// PreToolUse payload on stdin, and assert the JSON Claude Code would receive.
// The pure policy matrix is covered by pre-tool-use-policy.test.mjs; here we
// only verify the hook wires stdin → policy → stdout correctly.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(SCRIPT_DIR, "..", "pre-tool-use-hook.mjs");

let tmpRoot;
let projectRoot;
let pluginDataDir;

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ptu-hook-test-"));
  projectRoot = path.join(tmpRoot, "project");
  fs.mkdirSync(path.join(projectRoot, "plans"), { recursive: true });
  pluginDataDir = path.join(tmpRoot, "plugin-data");
  fs.mkdirSync(pluginDataDir, { recursive: true });
});

after(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

let counter = 0;

function seedSession({ sessionId, status, ownerAgent = "general-developer" }) {
  counter += 1;
  const planSlug = `plan-${counter}`;
  const taskBranch = `feat/${planSlug}`;
  const planPath = path.join(projectRoot, "plans", `${planSlug}.plan.md`);
  const stateDir = path.join(projectRoot, "plans", planSlug);
  fs.mkdirSync(stateDir, { recursive: true });
  const statePath = path.join(stateDir, ".runner-state.json");
  const worktreePath = path.join(projectRoot, "worktrees", `feat-${planSlug}`);

  const state = createInitialState({
    planSlug,
    planPath,
    ownerAgent,
    baseBranch: "main",
    taskBranch,
    worktreePath,
    sessionId,
  });

  // Walk to the requested (status, phase). v2 status names are:
  //   PREPARING / DISPATCHING / DEV_REVIEWING / CLOSING / MERGED.
  // For DISPATCHING the test passes either a phase tuple or just the bare
  // status (defaults to ARMED). Same for DEV_REVIEWING (defaults to AWAITING).
  const target = typeof status === "object" ? status : { status };
  const top = target.status;
  const stopPhase = target.stopPhase;
  const devPhase = target.devPhase;

  if (top === STATUS.PREPARING) {
    // already there
  } else if (top === STATUS.DISPATCHING) {
    transitionStatus(state, STATUS.DISPATCHING);
    setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
    setStopReviewArmed(state, true);
    if (stopPhase && stopPhase !== STOP_REVIEW_PHASE.ARMED) {
      setStopReviewPhase(state, stopPhase);
    }
  } else if (top === STATUS.DEV_REVIEWING) {
    transitionStatus(state, STATUS.DISPATCHING);
    setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
    setStopReviewArmed(state, true);
    transitionStatus(state, STATUS.DEV_REVIEWING);
    setStopReviewPhase(state, null);
    setDevReviewPhase(state, DEV_REVIEW_PHASE.AWAITING);
    if (devPhase && devPhase !== DEV_REVIEW_PHASE.AWAITING) {
      setDevReviewPhase(state, devPhase);
    }
  } else if (top === STATUS.CLOSING) {
    transitionStatus(state, STATUS.DISPATCHING);
    setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
    transitionStatus(state, STATUS.DEV_REVIEWING);
    setDevReviewPhase(state, DEV_REVIEW_PHASE.AWAITING);
    transitionStatus(state, STATUS.CLOSING);
    setDevReviewPhase(state, null);
  } else if (top === STATUS.MERGED) {
    transitionStatus(state, STATUS.DISPATCHING);
    setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
    transitionStatus(state, STATUS.DEV_REVIEWING);
    setDevReviewPhase(state, DEV_REVIEW_PHASE.AWAITING);
    transitionStatus(state, STATUS.CLOSING);
    setDevReviewPhase(state, null);
    transitionStatus(state, STATUS.MERGED);
  }
  saveState(statePath, state);

  const sessionsDir = path.join(pluginDataDir, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, `${sessionId}.json`),
    JSON.stringify(
      {
        sessionId,
        createdAt: new Date().toISOString(),
        cwd: projectRoot,
        activePlanStates: [statePath],
        stopReviewThreadId: null,
      },
      null,
      2,
    ),
  );

  return { statePath, worktreePath, planSlug };
}

function runHook({ sessionId, toolName, toolInput }) {
  const stdin = JSON.stringify({
    session_id: sessionId,
    cwd: projectRoot,
    tool_name: toolName,
    tool_input: toolInput,
  });
  return spawnSync(process.execPath, [HOOK], {
    input: stdin,
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_PLUGIN_DATA: pluginDataDir,
      CLAUDE_PROJECT_DIR: projectRoot,
    },
  });
}

describe("PreToolUse hook — wiring", () => {
  it("emits no output when the session has no active plan", () => {
    const r = runHook({
      sessionId: "no-plan",
      toolName: "Edit",
      toolInput: { file_path: "/anywhere.ts" },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("blocks Edit on a worktree file mid dev-review", () => {
    const sessionId = `sess-${++counter}`;
    const { worktreePath } = seedSession({
      sessionId,
      status: STATUS.DEV_REVIEWING,
    });
    const r = runHook({
      sessionId,
      toolName: "Edit",
      toolInput: { file_path: path.join(worktreePath, "src/x.ts") },
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /활성 plan/);
    assert.match(out.reason, /dev_reviewing/);
  });

  it("warns (does not block) on Edit outside the worktree", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.DEV_REVIEWING });
    const r = runHook({
      sessionId,
      toolName: "Edit",
      toolInput: { file_path: path.join(projectRoot, "scratch.txt") },
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(!("decision" in out), "should not block");
    assert.match(out.systemMessage, /활성 plan/);
  });

  it("blocks mutating Bash mid dev-review", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.DEV_REVIEWING });
    const r = runHook({
      sessionId,
      toolName: "Bash",
      toolInput: { command: "git commit -m bypass" },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
  });

  it("allows safe Bash inspection at any status", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.DEV_REVIEWING });
    const r = runHook({
      sessionId,
      toolName: "Bash",
      toolInput: { command: "git status" },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("allows the runner-state-cli at every status", () => {
    const sessionId = `sess-${++counter}`;
    const { statePath } = seedSession({
      sessionId,
      status: STATUS.DEV_REVIEWING,
    });
    const r = runHook({
      sessionId,
      toolName: "Bash",
      toolInput: {
        command: `node "$CLAUDE_PLUGIN_ROOT/scripts/runner-state-cli.mjs" mark-approved ${statePath}`,
      },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("allows Agent dispatch matching owner_agent at dispatching", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.DISPATCHING });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("blocks unrelated Agent dispatch at dispatching", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.DISPATCHING });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: { subagent_type: "Explore", prompt: "..." },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
  });

  it("allows mutating Bash at status=closing (Step 5 merge)", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.CLOSING });
    const r = runHook({
      sessionId,
      toolName: "Bash",
      toolInput: { command: "git merge feat/x --no-ff -m 'merge'" },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("treats merged plans as no-active-plan", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.MERGED });
    const r = runHook({
      sessionId,
      toolName: "Bash",
      toolInput: { command: "git commit -m anything" },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  // Phase 2 reshape: the hook no longer mutates plan-state. Auto-arm was
  // moved back to an explicit `runner-state-cli.mjs arm-for-dispatch` call
  // from the runner skill, so the hook is pure judgment again. The tests
  // below verify the policy verdicts; they do NOT touch state from the hook.

  it("allows owner_agent dispatch from preparing without touching state", () => {
    const sessionId = `sess-${++counter}`;
    const { statePath } = seedSession({ sessionId, status: STATUS.PREPARING });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "", "owner_agent dispatch should be allowed silently");
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.PREPARING, "hook must NOT advance status");
    assert.equal(after.stop_review.phase, null);
    assert.equal(after.stop_review.armed, false);
  });

  it("allows re-dispatch from dispatching+blocked without touching state", () => {
    const sessionId = `sess-${++counter}`;
    const { statePath } = seedSession({
      sessionId,
      status: { status: STATUS.DISPATCHING, stopPhase: STOP_REVIEW_PHASE.BLOCKED },
    });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
    const after = loadState(statePath);
    // Re-arming back to ARMED is the runner skill's job (via the
    // arm-for-dispatch CLI). The hook leaves phase at BLOCKED.
    assert.equal(after.status, STATUS.DISPATCHING);
    assert.equal(after.stop_review.phase, STOP_REVIEW_PHASE.BLOCKED);
  });

  it("blocks unrelated dispatch without touching state", () => {
    const sessionId = `sess-${++counter}`;
    const { statePath } = seedSession({ sessionId, status: STATUS.PREPARING });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: { subagent_type: "Explore", prompt: "..." },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block", "unrelated dispatch must still block");
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.PREPARING, "status untouched");
  });

  it("fails open on a malformed payload", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "{not json",
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PLUGIN_DATA: pluginDataDir },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  // Regression: the original BLOCK seen in the field. owner_agent stored bare
  // ("frontend-developer") while Claude dispatched the plugin-namespaced form
  // ("try-claude-code:frontend-developer"). The hook must not block via the
  // shared namespacing rule. State stays untouched (hook is pure judgment).
  it("allows namespaced subagent_type matching bare owner_agent", () => {
    const sessionId = `sess-${++counter}`;
    const { statePath } = seedSession({
      sessionId,
      status: STATUS.PREPARING,
      ownerAgent: "frontend-developer",
    });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: {
        subagent_type: "try-claude-code:frontend-developer",
        prompt: "...",
      },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "", "namespaced dispatch should be allowed silently");
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.PREPARING);
  });

  // Regression: pre-fix the model could dispatch the plan agent with
  // run_in_background: true, which returned the Agent call immediately and
  // let the turn end before any commits existed. The Stop hook then mistook
  // a base-branch commit for plan work and walked state to dev_reviewing,
  // deadlocking the late-arriving agent. The policy now blocks the call.
  it("blocks background plan-agent dispatch and leaves state at preparing", () => {
    const sessionId = `sess-${++counter}`;
    const { statePath } = seedSession({ sessionId, status: STATUS.PREPARING });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: {
        subagent_type: "general-developer",
        prompt: "...",
        run_in_background: true,
      },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /run_in_background/);
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.PREPARING, "hook must not have walked status");
    assert.equal(after.stop_review.phase, null);
    assert.equal(after.stop_review.armed, false);
  });

  // Phase 2 fix: sub-agent's Edit on a worktree file must ALLOW even during
  // dispatching. The target-location rule recognizes file_path inside
  // worktree as the agent's work.
  it("allows Edit on a worktree file during dispatching (sub-agent simulate)", () => {
    const sessionId = `sess-${++counter}`;
    const { worktreePath } = seedSession({
      sessionId,
      status: STATUS.DISPATCHING,
    });
    const r = runHook({
      sessionId,
      toolName: "Edit",
      toolInput: { file_path: path.join(worktreePath, "src/x.ts") },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "", "sub-agent's worktree edits must be silent ALLOW");
  });

  // Phase 2 fix: sub-agent's `git commit` from cwd=worktree must ALLOW
  // even during dispatching.
  it("allows mutating Bash with cwd inside worktree during dispatching", () => {
    const sessionId = `sess-${++counter}`;
    const { worktreePath } = seedSession({
      sessionId,
      status: STATUS.DISPATCHING,
    });
    const r = runHook({
      sessionId,
      toolName: "Bash",
      toolInput: {
        command: "git add -A && git commit -m 'feat(x): phase 1'",
        cwd: worktreePath,
      },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "", "sub-agent's git commits must be silent ALLOW");
  });

  it("blocks a namespaced subagent from a different plugin", () => {
    const sessionId = `sess-${++counter}`;
    const { statePath } = seedSession({
      sessionId,
      status: STATUS.PREPARING,
      ownerAgent: "try-claude-code:frontend-developer",
    });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: {
        subagent_type: "figma:frontend-developer",
        prompt: "...",
      },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /owner_agent/);
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.PREPARING, "status must not advance");
  });
});
