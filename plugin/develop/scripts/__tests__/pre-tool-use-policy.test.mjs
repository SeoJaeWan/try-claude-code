import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEV_REVIEW_PHASE,
  STATUS,
  STOP_REVIEW_PHASE,
  createInitialState,
  setDevReviewPhase,
  setStopReviewPhase,
  transitionStatus,
} from "../lib/runner-state.mjs";
import {
  VERDICT,
  agentNamesMatch,
  classifyBashCommand,
  evaluate,
} from "../lib/pre-tool-use-policy.mjs";

// pre-tool-use-policy is the pure decision function. Phase 2 reshape replaced
// the 5×4 status×tool matrix with a target-location rule: tool calls whose
// `cwd` (Bash) or `file_path` (Edit/Write) lie inside the active worktree
// are ALLOWed during agent-active phases (dispatching, dev_reviewing/rework).
// Tests below cover the rule directly so a future status / tool / phase
// addition shows up here without needing to spawn the hook process.

const PLAN_AREA = "/repo/worktrees/feat-x";
const PLAN_DIR = "/repo/plans/x";

// Build a state at the requested top-level status. For DISPATCHING and
// DEV_REVIEWING, callers can pass `stopPhase` / `devPhase` overrides to
// land on the right sub-state.
function stateAt(status, { stopPhase = null, devPhase = null, overrides = {} } = {}) {
  const s = createInitialState({
    planSlug: "plan-x",
    planPath: "/repo/plans/x.plan.md",
    ownerAgent: "general-developer",
    baseBranch: "main",
    taskBranch: "feat/x",
    worktreePath: PLAN_AREA,
    sessionId: "sess-1",
  });
  const order = [
    STATUS.PREPARING,
    STATUS.DISPATCHING,
    STATUS.DEV_REVIEWING,
    STATUS.CLOSING,
    STATUS.MERGED,
  ];
  const i = order.indexOf(status);
  if (i > 0) for (let j = 1; j <= i; j += 1) transitionStatus(s, order[j]);
  if (status === STATUS.DISPATCHING) {
    setStopReviewPhase(s, STOP_REVIEW_PHASE.ARMED);
    if (stopPhase && stopPhase !== STOP_REVIEW_PHASE.ARMED) {
      setStopReviewPhase(s, stopPhase);
    }
  } else if (status === STATUS.DEV_REVIEWING) {
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    if (devPhase && devPhase !== DEV_REVIEW_PHASE.AWAITING) {
      setDevReviewPhase(s, devPhase);
    }
  }
  s.__statePath = "/repo/plans/x/.runner-state.json";
  return Object.assign(s, overrides);
}

describe("classifyBashCommand", () => {
  it("classifies runner-state-cli invocations as safe", () => {
    assert.equal(
      classifyBashCommand(
        'node "${CLAUDE_PLUGIN_ROOT}/scripts/runner-state-cli.mjs" mark-approved /x/.runner-state.json',
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

  // Regression: PreToolUse was blocking `git -C <worktree> log ...` because
  // the SAFE regex required the subcommand to be the second token and `-C`
  // sat in front of it. The normalizer strips git-level flags before the
  // subcommand match.
  it("treats git-level flags (-C, --git-dir, --work-tree, --no-pager, -c) as transparent", () => {
    for (const cmd of [
      "git -C /tmp/repo log --oneline",
      'git -C "C:/Users/x/y" log --oneline main..feat',
      "git -C '/tmp/repo with spaces' status",
      "git --git-dir=/tmp/.git log",
      "git --git-dir /tmp/.git log",
      "git --work-tree=/tmp log",
      "git --no-pager log --oneline",
      "git -c color.ui=never log",
      "git -C /tmp -c color.ui=never --no-pager log",
    ]) {
      assert.equal(classifyBashCommand(cmd), "safe", cmd);
    }
  });

  it("classifies git-level flags in front of a mutating subcommand as mutating", () => {
    for (const cmd of [
      "git -C /tmp/repo commit -m x",
      'git -C "C:/Users/x/y" push origin main',
      "git --git-dir=/tmp/.git reset --hard HEAD~1",
      "git -c user.email=x@y.com commit -m x",
    ]) {
      assert.equal(classifyBashCommand(cmd), "mutating", cmd);
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

  it("classifies anything not in the safe-list as mutating", () => {
    // Phase 2 reshape: the explicit mutating-pattern list was removed.
    // Everything not safe is mutating now — that flips the previous
    // false-positive bias toward strict (unknown commands hit the
    // mutating path instead of being silently allowed).
    for (const cmd of [
      "git commit -m 'x'",
      "git push origin main",
      "git worktree add -b feat/x worktrees/feat-x main",
      "rm -rf worktrees/feat-x",
      "python3 some_script.py",
      "node -e 'process.exit(1)'",
    ]) {
      assert.equal(classifyBashCommand(cmd), "mutating", cmd);
    }
    // Empty / whitespace commands still classify as safe.
    assert.equal(classifyBashCommand(""), "safe");
    assert.equal(classifyBashCommand("   "), "safe");
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
    for (const status of [
      STATUS.PREPARING,
      STATUS.DISPATCHING,
      STATUS.DEV_REVIEWING,
      STATUS.CLOSING,
    ]) {
      const r = evaluate({
        state: stateAt(status),
        toolName: "Bash",
        toolInput: { command: "git status" },
        planAreas: [PLAN_AREA, PLAN_DIR],
      });
      assert.equal(r.decision, VERDICT.ALLOW, `expected allow at ${status}`);
    }
  });

  it("blocks mutating Bash mid-flight when called from outside the worktree", () => {
    for (const status of [
      STATUS.PREPARING,
      STATUS.DISPATCHING,
      STATUS.DEV_REVIEWING,
    ]) {
      const r = evaluate({
        state: stateAt(status),
        toolName: "Bash",
        toolInput: { command: "git commit -m oops" }, // no cwd → outside worktree
        planAreas: [PLAN_AREA, PLAN_DIR],
      });
      assert.equal(r.decision, VERDICT.BLOCK, `expected block at ${status}`);
      assert.match(r.reason, /활성 plan/);
    }
  });

  it("allows mutating Bash at status=closing (Step 5 merges)", () => {
    const r = evaluate({
      state: stateAt(STATUS.CLOSING),
      toolName: "Bash",
      toolInput: { command: "git merge feat/x --no-ff -m 'merge'" },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("ALLOWs mutating Bash when cwd is inside the worktree during dispatching", () => {
    // The fix for the sub-agent BLOCK loop: the plan-dispatch.md prompt
    // instructs the agent to `cd` into the worktree before any command,
    // so its `git commit -m '...'` calls arrive with `cwd=<worktree>`.
    // Pre-fix matrix BLOCKed these as if main session were committing;
    // the target-based rule recognizes them as agent work and ALLOWs.
    const r = evaluate({
      state: stateAt(STATUS.DISPATCHING),
      toolName: "Bash",
      toolInput: {
        command: "git add -A && git commit -m 'feat(x): phase 1'",
        cwd: PLAN_AREA,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("ALLOWs mutating Bash from inside the worktree during dev_reviewing/rework", () => {
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.REWORK }),
      toolName: "Bash",
      toolInput: { command: "git commit -am 'fix(x): address review'", cwd: PLAN_AREA },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("BLOCKs mutating Bash from inside the worktree during dev_reviewing/awaiting", () => {
    // Reviewer-drift protection: even if a call arrives with cwd inside
    // the worktree, no agent should be running during awaiting/qa, so we
    // refuse the mutation to keep the reviewer's diff stable.
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.AWAITING }),
      toolName: "Bash",
      toolInput: { command: "git commit -am 'oops'", cwd: PLAN_AREA },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("treats unknown Bash commands as mutating (block from outside worktree)", () => {
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING),
      toolName: "Bash",
      toolInput: { command: "python3 mystery.py" },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });
});

describe("evaluate — Step 2 worktree bootstrap carve-out", () => {
  // Step 2 of runner/SKILL.md requires the main session to run
  // `git worktree add` while status="preparing" — the worktree directory has
  // to exist before the plan agent is dispatched in Step 3. The rule
  // narrows this carve-out via `isWorktreeBootstrapCommand` so only commands
  // touching `state.worktree_path` are allowed, and only at `preparing`.

  it("ALLOWs `git worktree add` at preparing when targeting state.worktree_path", () => {
    const r = evaluate({
      state: stateAt(STATUS.PREPARING),
      toolName: "Bash",
      toolInput: {
        command: `git worktree add -b feat/x "${PLAN_AREA}" main`,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("BLOCKs `git worktree add` at preparing when path is unrelated", () => {
    const r = evaluate({
      state: stateAt(STATUS.PREPARING),
      toolName: "Bash",
      toolInput: {
        command: "git worktree add -b feat/other /tmp/elsewhere main",
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
    assert.match(r.reason, /활성 plan/);
  });

  it("ALLOWs `git worktree remove --force` at preparing (stale-wipe path)", () => {
    const r = evaluate({
      state: stateAt(STATUS.PREPARING),
      toolName: "Bash",
      toolInput: {
        command: `git worktree remove --force "${PLAN_AREA}"`,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("BLOCKs `git worktree remove` without --force at preparing", () => {
    const r = evaluate({
      state: stateAt(STATUS.PREPARING),
      toolName: "Bash",
      toolInput: {
        command: `git worktree remove "${PLAN_AREA}"`,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("BLOCKs `git worktree add` at dispatching from outside (carve-out is preparing-only)", () => {
    const r = evaluate({
      state: stateAt(STATUS.DISPATCHING),
      toolName: "Bash",
      toolInput: {
        command: `git worktree add -b feat/x "${PLAN_AREA}" main`,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });
});

describe("evaluate — Edit / Write gating", () => {
  it("ALLOWs Edit on worktree files during dispatching (sub-agent simulate)", () => {
    // The fix for the sub-agent BLOCK loop: when the sub-agent edits a
    // file inside the worktree, `file_path` lands inside `worktree_path`.
    // The target-based rule recognizes this as agent work and ALLOWs.
    const r = evaluate({
      state: stateAt(STATUS.DISPATCHING),
      toolName: "Edit",
      toolInput: { file_path: `${PLAN_AREA}/src/index.ts` },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("ALLOWs Edit on worktree files during dev_reviewing/rework", () => {
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.REWORK }),
      toolName: "Edit",
      toolInput: { file_path: `${PLAN_AREA}/src/index.ts` },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("BLOCKs Edit on worktree files during dev_reviewing/awaiting (drift protection)", () => {
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING),
      toolName: "Edit",
      toolInput: { file_path: `${PLAN_AREA}/src/index.ts` },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("BLOCKs Edit on worktree files during dev_reviewing/qa", () => {
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.QA }),
      toolName: "Edit",
      toolInput: { file_path: `${PLAN_AREA}/src/index.ts` },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("downgrades Edit on unrelated files to a warn", () => {
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING),
      toolName: "Edit",
      toolInput: { file_path: "/repo/scratch/notes.md" },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.WARN);
  });

  it("BLOCKs Write on plan-state file directly (always, every status)", () => {
    for (const status of [STATUS.PREPARING, STATUS.DISPATCHING, STATUS.DEV_REVIEWING]) {
      const r = evaluate({
        state: stateAt(status),
        toolName: "Write",
        toolInput: { file_path: `${PLAN_DIR}/.runner-state.json` },
        planAreas: [PLAN_AREA, PLAN_DIR],
      });
      assert.equal(r.decision, VERDICT.BLOCK, status);
      assert.match(r.reason, /runner-state-cli/);
    }
  });

  it("warns (does not block) Edit on worktree files at status=closing", () => {
    const r = evaluate({
      state: stateAt(STATUS.CLOSING),
      toolName: "Edit",
      toolInput: { file_path: `${PLAN_AREA}/src/index.ts` },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.WARN);
  });
});

describe("evaluate — Agent / Task dispatch gating", () => {
  it("allows Agent dispatch at dispatching when subagent_type matches owner_agent", () => {
    const r = evaluate({
      state: stateAt(STATUS.DISPATCHING),
      toolName: "Task",
      toolInput: {
        subagent_type: "general-developer",
        prompt: "...",
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("blocks unrelated Agent dispatch at dispatching", () => {
    const r = evaluate({
      state: stateAt(STATUS.DISPATCHING),
      toolName: "Task",
      toolInput: {
        subagent_type: "Explore",
        prompt: "...",
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
  });

  it("allows owner_agent Agent dispatch at preparing", () => {
    const r = evaluate({
      state: stateAt(STATUS.PREPARING),
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("blocks plan-agent dispatch when run_in_background is true (preparing)", () => {
    const r = evaluate({
      state: stateAt(STATUS.PREPARING),
      toolName: "Task",
      toolInput: {
        subagent_type: "general-developer",
        prompt: "...",
        run_in_background: true,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
    assert.match(r.reason, /run_in_background/);
    assert.match(r.reason, /포그라운드/);
  });

  it("blocks plan-agent dispatch when run_in_background is true (dispatching)", () => {
    const r = evaluate({
      state: stateAt(STATUS.DISPATCHING),
      toolName: "Task",
      toolInput: {
        subagent_type: "general-developer",
        prompt: "...",
        run_in_background: true,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
    assert.match(r.reason, /run_in_background/);
  });

  it("blocks rework dispatch when run_in_background is true (dev_reviewing/rework)", () => {
    const r = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.REWORK }),
      toolName: "Task",
      toolInput: {
        subagent_type: "frontend-developer",
        prompt: "...",
        run_in_background: true,
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
    assert.match(r.reason, /run_in_background/);
  });

  it("does not treat run_in_background:false as background", () => {
    for (const flag of [false, undefined, null]) {
      const r = evaluate({
        state: stateAt(STATUS.DISPATCHING),
        toolName: "Task",
        toolInput: {
          subagent_type: "general-developer",
          prompt: "...",
          run_in_background: flag,
        },
        planAreas: [PLAN_AREA, PLAN_DIR],
      });
      assert.equal(r.decision, VERDICT.ALLOW, `flag=${flag}`);
    }
  });

  it("allows Agent dispatch at dev_reviewing only when phase is rework", () => {
    const rework = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.REWORK }),
      toolName: "Task",
      toolInput: { subagent_type: "frontend-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(rework.decision, VERDICT.ALLOW);

    const awaiting = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.AWAITING }),
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(awaiting.decision, VERDICT.BLOCK);
    assert.match(awaiting.reason, /phase="awaiting"/);

    const qa = evaluate({
      state: stateAt(STATUS.DEV_REVIEWING, { devPhase: DEV_REVIEW_PHASE.QA }),
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(qa.decision, VERDICT.BLOCK);
    assert.match(qa.reason, /phase="qa"/);
  });

  it("warns on Agent dispatch at closing", () => {
    const r = evaluate({
      state: stateAt(STATUS.CLOSING),
      toolName: "Task",
      toolInput: { subagent_type: "general-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.WARN);
  });
});

describe("agentNamesMatch — plugin-namespacing rule", () => {
  it("treats identical strings as a match", () => {
    assert.equal(agentNamesMatch("frontend-developer", "frontend-developer"), true);
    assert.equal(
      agentNamesMatch(
        "try-claude-code:frontend-developer",
        "try-claude-code:frontend-developer",
      ),
      true,
    );
  });

  it("matches a namespaced subagent against a bare owner_agent", () => {
    assert.equal(
      agentNamesMatch("try-claude-code:frontend-developer", "frontend-developer"),
      true,
    );
  });

  it("matches a bare subagent against a namespaced owner_agent", () => {
    assert.equal(
      agentNamesMatch("frontend-developer", "try-claude-code:frontend-developer"),
      true,
    );
  });

  it("refuses cross-plugin namespaced collisions", () => {
    assert.equal(
      agentNamesMatch(
        "try-claude-code:frontend-developer",
        "figma:frontend-developer",
      ),
      false,
    );
  });

  it("refuses unrelated names regardless of namespacing", () => {
    assert.equal(agentNamesMatch("Explore", "frontend-developer"), false);
    assert.equal(
      agentNamesMatch("try-claude-code:frontend-developer", "general-developer"),
      false,
    );
  });

  it("rejects non-string inputs without throwing", () => {
    assert.equal(agentNamesMatch(null, "frontend-developer"), false);
    assert.equal(agentNamesMatch("frontend-developer", undefined), false);
  });
});

describe("evaluate — Agent dispatch with plugin namespacing", () => {
  it("ALLOWs bare owner_agent vs namespaced subagent_type", () => {
    const s = stateAt(STATUS.PREPARING);
    s.owner_agent = "frontend-developer";
    const r = evaluate({
      state: s,
      toolName: "Task",
      toolInput: {
        subagent_type: "try-claude-code:frontend-developer",
        prompt: "...",
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("ALLOWs namespaced owner_agent vs bare subagent_type", () => {
    const s = stateAt(STATUS.DISPATCHING);
    s.owner_agent = "try-claude-code:frontend-developer";
    const r = evaluate({
      state: s,
      toolName: "Task",
      toolInput: { subagent_type: "frontend-developer", prompt: "..." },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.ALLOW);
  });

  it("BLOCKs a namespaced subagent from a different plugin", () => {
    const s = stateAt(STATUS.DISPATCHING);
    s.owner_agent = "try-claude-code:frontend-developer";
    const r = evaluate({
      state: s,
      toolName: "Task",
      toolInput: {
        subagent_type: "figma:frontend-developer",
        prompt: "...",
      },
      planAreas: [PLAN_AREA, PLAN_DIR],
    });
    assert.equal(r.decision, VERDICT.BLOCK);
    assert.match(r.reason, /owner_agent/);
  });
});

describe("evaluate — passthrough tools", () => {
  it("does not gate Read / Glob / Grep / AskUserQuestion", () => {
    const s = stateAt(STATUS.DEV_REVIEWING);
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
