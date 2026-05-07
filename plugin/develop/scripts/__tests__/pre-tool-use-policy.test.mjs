import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  STATUS,
  createInitialState,
  transitionStatus,
} from "../lib/runner-state.mjs";
import {
  VERDICT,
  classifyBashCommand,
  evaluate,
} from "../lib/pre-tool-use-policy.mjs";

// pre-tool-use-policy is the pure decision function. Tests cover the matrix
// directly so a future status / tool addition shows up here without needing
// to spawn the hook process. Hook integration tests live next door in
// pre-tool-use-hook.test.mjs.

const PLAN_AREA = "/repo/worktrees/feat-x";
const PLAN_DIR = "/repo/plans/x";

function stateAt(status, overrides = {}) {
  const s = createInitialState({
    planSlug: "plan-x",
    planPath: "/repo/plans/x.plan.md",
    ownerAgent: "general-developer",
    baseBranch: "main",
    taskBranch: "feat/x",
    worktreePath: PLAN_AREA,
    sessionId: "sess-1",
  });
  // Walk forward so the legal-transition table approves every step.
  const order = [
    STATUS.VALIDATING,
    STATUS.DISPATCHING,
    STATUS.AWAITING_STOP_REVIEW,
    STATUS.AWAITING_DEV_REVIEW,
    STATUS.APPROVED,
    STATUS.MERGED,
  ];
  const i = order.indexOf(status);
  if (i > 0) for (let j = 1; j <= i; j += 1) transitionStatus(s, order[j]);
  else if (status === STATUS.STOP_REVIEW_BLOCKED) {
    transitionStatus(s, STATUS.DISPATCHING);
    transitionStatus(s, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(s, STATUS.STOP_REVIEW_BLOCKED);
  } else if (status === STATUS.REWORK_IN_PROGRESS) {
    transitionStatus(s, STATUS.DISPATCHING);
    transitionStatus(s, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(s, STATUS.AWAITING_DEV_REVIEW);
    transitionStatus(s, STATUS.REWORK_IN_PROGRESS);
  } else if (status === STATUS.QA_PENDING) {
    transitionStatus(s, STATUS.DISPATCHING);
    transitionStatus(s, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(s, STATUS.AWAITING_DEV_REVIEW);
    transitionStatus(s, STATUS.QA_PENDING);
  }
  s.__statePath = "/repo/plans/x/.runner-state.json";
  return Object.assign(s, overrides);
}

describe("classifyBashCommand", () => {
  it("classifies runner-state-cli invocations as safe", () => {
    assert.equal(
      classifyBashCommand(
        'node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" arm-for-dispatch /x/.runner-state.json',
      ),
      "safe",
    );
  });

  it("classifies read-only git inspection as safe", () => {
    for (const cmd of [
      "git rev-parse --abbrev-ref HEAD",
      "git log --oneline main..feat/x",
      "git status",
      "git diff --stat",
      "git worktree list --porcelain",
    ]) {
      assert.equal(classifyBashCommand(cmd), "safe", cmd);
    }
  });

  it("classifies POSIX read-only inspection as safe", () => {
    for (const cmd of [
      "ls plans/",
      "cat plans/x/.runner-state.json",
      "[ -d /repo/worktrees/feat-x ]",
      "test -f /repo/plans/x/.runner-state.json",
    ]) {
      assert.equal(classifyBashCommand(cmd), "safe", cmd);
    }
  });

  it("classifies mutating git operations as mutating", () => {
    for (const cmd of [
      "git commit -m 'x'",
      "git push origin main",
      "git merge feat/x --no-ff",
      "git checkout feat/x",
      "git branch -d feat/x",
      "git worktree add -b feat/x worktrees/feat-x main",
      "git reset --hard HEAD~1",
      "git add -A",
    ]) {
      assert.equal(classifyBashCommand(cmd), "mutating", cmd);
    }
  });

  it("classifies filesystem mutations as mutating", () => {
    for (const cmd of [
      "rm -rf worktrees/feat-x",
      "mv plans/x.plan.md plans/y.plan.md",
      "echo foo > plans/x.plan.md",
      "tee -a plans/x/.runner-state.json",
    ]) {
      assert.equal(classifyBashCommand(cmd), "mutating", cmd);
    }
  });

  it("classifies unknown commands as ambiguous", () => {
    assert.equal(classifyBashCommand("python3 some_script.py"), "ambiguous");
    assert.equal(classifyBashCommand(""), "safe"); // empty / blank → trivially safe
  });
});

describe("evaluate — no active plan", () => {
  it("allows everything when state is null", () => {
    const r = evaluate({
      state: null,
      toolName: "Edit",
      toolInput: { file_path: "/repo/anywhere.ts" },
      planAreas: [],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
    assert.equal(r.reason, null);
  });

  it("allows everything when state is in a terminal status", () => {
    const s = stateAt(STATUS.MERGED);
    const r = evaluate({
      state: s,
      toolName: "Bash",
      toolInput: { command: "git commit -m foo" },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });
});

describe("evaluate — Bash gating", () => {
  it("allows safe Bash at every non-terminal status", () => {
    const statuses = [
      STATUS.VALIDATING,
      STATUS.DISPATCHING,
      STATUS.AWAITING_STOP_REVIEW,
      STATUS.STOP_REVIEW_BLOCKED,
      STATUS.AWAITING_DEV_REVIEW,
      STATUS.REWORK_IN_PROGRESS,
      STATUS.QA_PENDING,
      STATUS.APPROVED,
    ];
    for (const status of statuses) {
      const r = evaluate({
        state: stateAt(status),
        toolName: "Bash",
        toolInput: { command: "git status" },
        planAreas: [PLAN_AREA, PLAN_DIR],
      });
      assert.equal(r.decision, VERDICT.ALLOW, `expected allow at ${status}`);
    }
  });

  it("blocks mutating Bash mid-flight", () => {
    for (const status of [
      STATUS.VALIDATING,
      STATUS.DISPATCHING,
      STATUS.AWAITING_STOP_REVIEW,
      STATUS.STOP_REVIEW_BLOCKED,
      STATUS.AWAITING_DEV_REVIEW,
      STATUS.REWORK_IN_PROGRESS,
      STATUS.QA_PENDING,
    ]) {
      const r = evaluate({
        state: stateAt(status),
        toolName: "Bash",
        toolInput: { command: "git commit -m oops" },
        planAreas: [PLAN_AREA, PLAN_DIR],
      });
      assert.equal(r.decision, VERDICT.BLOCK, `expected block at ${status}`);
      assert.match(r.reason, /활성 plan/);
    }
  });

  it("allows mutating Bash at status=approved (Step 5 merges)", () => {
    const r = evaluate({
      state: stateAt(STATUS.APPROVED),
      toolName: "Bash",
      toolInput: { command: "git merge feat/x --no-ff -m 'merge'" },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("treats ambiguous Bash as mutating (block)", () => {
    const r = evaluate({
      state: stateAt(STATUS.AWAITING_DEV_REVIEW),
      toolName: "Bash",
      toolInput: { command: "python3 mystery.py" },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });
});

describe("evaluate — Edit / Write gating", () => {
  it("blocks Edit on worktree files mid-review", () => {
    const r = evaluate({
      state: stateAt(STATUS.AWAITING_DEV_REVIEW),
      toolName: "Edit",
      toolInput: { file_path: `${PLAN_AREA}/src/index.ts` },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("downgrades Edit on unrelated files to a warn", () => {
    const r = evaluate({
      state: stateAt(STATUS.AWAITING_DEV_REVIEW),
      toolName: "Edit",
      toolInput: { file_path: "/repo/scratch/notes.md" },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.WARN);
  });

  it("blocks Write on plan-state file directly", () => {
    const r = evaluate({
      state: stateAt(STATUS.DISPATCHING),
      toolName: "Write",
      toolInput: { file_path: `${PLAN_DIR}/.runner-state.json` },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });
});

describe("evaluate — Agent / Task dispatch gating", () => {
  it("allows Agent dispatch at awaiting_stop_review when subagent_type matches owner_agent", () => {
    const r = evaluate({
      state: stateAt(STATUS.AWAITING_STOP_REVIEW),
      toolName: "Task",
      toolInput: {
        subagent_type: "general-developer",
        prompt: "...",
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("blocks unrelated Agent dispatch at awaiting_stop_review", () => {
    const r = evaluate({
      state: stateAt(STATUS.AWAITING_STOP_REVIEW),
      toolName: "Task",
      toolInput: {
        subagent_type: "Explore",
        prompt: "...",
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("blocks Agent dispatch at validating (skill must arm first)", () => {
    const r = evaluate({
      state: stateAt(STATUS.VALIDATING),
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("allows any Agent dispatch at rework_in_progress (reviewer chose the agent)", () => {
    const r = evaluate({
      state: stateAt(STATUS.REWORK_IN_PROGRESS),
      toolName: "Task",
      toolInput: { subagent_type: "frontend-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("blocks Agent dispatch at awaiting_dev_review (no fresh dispatches mid-review)", () => {
    const r = evaluate({
      state: stateAt(STATUS.AWAITING_DEV_REVIEW),
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });
});

describe("evaluate — passthrough tools", () => {
  it("does not gate Read / Glob / Grep / AskUserQuestion", () => {
    const s = stateAt(STATUS.AWAITING_DEV_REVIEW);
    for (const toolName of ["Read", "Glob", "Grep", "AskUserQuestion"]) {
      const r = evaluate({
        state: s,
        toolName,
        toolInput: {},
        planAreas: [PLAN_AREA, PLAN_DIR],
      });
      assert.equal(r.decision, VERDICT.ALLOW, toolName);
    }
  });
});
