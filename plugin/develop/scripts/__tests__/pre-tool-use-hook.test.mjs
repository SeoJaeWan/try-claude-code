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
  saveState,
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

function seedSession({ sessionId, status }) {
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
    ownerAgent: "general-developer",
    baseBranch: "main",
    taskBranch,
    worktreePath,
    sessionId,
  });

  // Walk to the requested status.
  if (status === STATUS.AWAITING_DEV_REVIEW) {
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(state, STATUS.AWAITING_DEV_REVIEW);
  } else if (status === STATUS.AWAITING_STOP_REVIEW) {
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
  } else if (status === STATUS.APPROVED) {
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(state, STATUS.AWAITING_DEV_REVIEW);
    transitionStatus(state, STATUS.APPROVED);
  } else if (status === STATUS.MERGED) {
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(state, STATUS.AWAITING_DEV_REVIEW);
    transitionStatus(state, STATUS.APPROVED);
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
      status: STATUS.AWAITING_DEV_REVIEW,
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
    assert.match(out.reason, /awaiting_dev_review/);
  });

  it("warns (does not block) on Edit outside the worktree", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.AWAITING_DEV_REVIEW });
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
    seedSession({ sessionId, status: STATUS.AWAITING_DEV_REVIEW });
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
    seedSession({ sessionId, status: STATUS.AWAITING_DEV_REVIEW });
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
      status: STATUS.AWAITING_DEV_REVIEW,
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

  it("allows Agent dispatch matching owner_agent at awaiting_stop_review", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.AWAITING_STOP_REVIEW });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });

  it("blocks unrelated Agent dispatch at awaiting_stop_review", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.AWAITING_STOP_REVIEW });
    const r = runHook({
      sessionId,
      toolName: "Task",
      toolInput: { subagent_type: "Explore", prompt: "..." },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
  });

  it("allows mutating Bash at status=approved (Step 5 merge)", () => {
    const sessionId = `sess-${++counter}`;
    seedSession({ sessionId, status: STATUS.APPROVED });
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

  it("fails open on a malformed payload", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "{not json",
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PLUGIN_DATA: pluginDataDir },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
});
