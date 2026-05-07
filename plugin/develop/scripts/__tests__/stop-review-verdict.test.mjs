import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  STATUS,
  createInitialState,
  loadState,
  saveState,
  setStopReviewArmed,
  transitionStatus,
} from "../lib/runner-state.mjs";
import { STOP_REVIEW_OUTCOME } from "../lib/stop-review-outcome.mjs";
import {
  CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD,
  applyVerdictToPlanState,
} from "../lib/stop-review-verdict.mjs";

// Direct unit tests for the verdict-application logic. The hook script
// composes its decision payload from the strings this function returns and
// the side-effects it makes on the plan-state file, so locking that contract
// here keeps the integration testable without spinning up Codex.

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "stop-review-verdict-test-"));
});

after(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

let counter = 0;

function makeStateAtAwaiting(extraSetup) {
  counter += 1;
  const dir = path.join(tmpDir, `plan-${counter}`);
  fs.mkdirSync(dir, { recursive: true });
  const statePath = path.join(dir, ".runner-state.json");
  const state = createInitialState({
    planSlug: `plan-${counter}`,
    planPath: `/repo/plans/plan-${counter}.plan.md`,
    ownerAgent: "general-developer",
    baseBranch: "main",
    taskBranch: `feat/plan-${counter}`,
    worktreePath: `/repo/worktrees/feat-plan-${counter}`,
  });
  transitionStatus(state, STATUS.DISPATCHING);
  transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
  setStopReviewArmed(state, true);
  if (extraSetup) extraSetup(state);
  saveState(statePath, state);
  return { statePath, state };
}

function reviewItemFor(state, statePath, headSha = "abcdef1234567890") {
  return {
    state,
    statePath,
    headSha,
    branch: state.task_branch,
    diff: "",
    commitMessages: "",
    path: state.worktree_path,
  };
}

// ---------------------------------------------------------------------------
// ALLOW path
// ---------------------------------------------------------------------------

describe("applyVerdictToPlanState — ALLOW", () => {
  it("disarms, advances to awaiting_dev_review, clears downgrade streak", () => {
    const { statePath, state } = makeStateAtAwaiting((s) => {
      s.stop_review.consecutive_downgrades = 4;
    });
    const out = applyVerdictToPlanState(
      reviewItemFor(state, statePath),
      STOP_REVIEW_OUTCOME.ALLOW,
      { reason: null },
    );
    assert.equal(out.plannerDirective, "");
    assert.equal(out.escalationNote, "");
    assert.equal(out.downgradeWarning, "");
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.AWAITING_DEV_REVIEW);
    assert.equal(after.stop_review.armed, false);
    assert.equal(after.stop_review.last_reviewed_commit, "abcdef1234567890");
    assert.equal(after.stop_review.last_result, "ALLOW");
    assert.equal(after.stop_review.consecutive_downgrades, 0);
  });
});

// ---------------------------------------------------------------------------
// ALLOW_DOWNGRADED path — bump and warn at threshold
// ---------------------------------------------------------------------------

describe("applyVerdictToPlanState — ALLOW_DOWNGRADED", () => {
  it("bumps consecutive_downgrades and stays silent below threshold", () => {
    const { statePath, state } = makeStateAtAwaiting();
    const out = applyVerdictToPlanState(
      reviewItemFor(state, statePath),
      STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED,
      { reason: null },
    );
    assert.equal(out.downgradeWarning, "");
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.AWAITING_DEV_REVIEW);
    assert.equal(after.stop_review.consecutive_downgrades, 1);
  });

  it("emits a warning paragraph at the configured threshold", () => {
    const { statePath, state } = makeStateAtAwaiting((s) => {
      s.stop_review.consecutive_downgrades =
        CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD - 1;
    });
    const out = applyVerdictToPlanState(
      reviewItemFor(state, statePath),
      STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED,
      { reason: null },
    );
    assert.match(
      out.downgradeWarning,
      new RegExp(
        `연속 ${CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD}회 BLOCK이 저신뢰`,
      ),
    );
    assert.match(out.downgradeWarning, /\.codex\/reviews\//);
    const after = loadState(statePath);
    assert.equal(
      after.stop_review.consecutive_downgrades,
      CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD,
    );
  });

  it("keeps emitting warnings past the threshold (each downgrade nudges)", () => {
    const { statePath, state } = makeStateAtAwaiting((s) => {
      s.stop_review.consecutive_downgrades =
        CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD + 2;
    });
    const out = applyVerdictToPlanState(
      reviewItemFor(state, statePath),
      STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED,
      { reason: null },
    );
    assert.match(out.downgradeWarning, /연속 \d+회/);
  });
});

// ---------------------------------------------------------------------------
// BLOCK and SKIPPED reset the streak
// ---------------------------------------------------------------------------

describe("applyVerdictToPlanState — streak reset paths", () => {
  it("BLOCK resets consecutive_downgrades to 0", () => {
    const { statePath, state } = makeStateAtAwaiting((s) => {
      s.stop_review.consecutive_downgrades = 9;
    });
    applyVerdictToPlanState(
      reviewItemFor(state, statePath),
      STOP_REVIEW_OUTCOME.BLOCK,
      { reason: "BLOCK: real high-confidence finding\n[conf 9] x" },
    );
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.STOP_REVIEW_BLOCKED);
    assert.equal(after.stop_review.consecutive_downgrades, 0);
  });

  it("SKIPPED (codex unavailable) resets consecutive_downgrades to 0", () => {
    const { statePath, state } = makeStateAtAwaiting((s) => {
      s.stop_review.consecutive_downgrades = 7;
    });
    applyVerdictToPlanState(
      reviewItemFor(state, statePath),
      STOP_REVIEW_OUTCOME.SKIPPED,
      { reason: null },
    );
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.AWAITING_DEV_REVIEW);
    assert.equal(after.stop_review.consecutive_downgrades, 0);
    assert.equal(after.stop_review.last_result, "skipped");
  });

  it("TIMEOUT does not mutate the streak or status", () => {
    const { statePath, state } = makeStateAtAwaiting((s) => {
      s.stop_review.consecutive_downgrades = 3;
    });
    const before = loadState(statePath);
    applyVerdictToPlanState(
      reviewItemFor(state, statePath),
      STOP_REVIEW_OUTCOME.TIMEOUT,
      { reason: "timeout", timedOut: true },
    );
    const after = loadState(statePath);
    // status unchanged, count unchanged, last_reviewed_commit unchanged.
    assert.equal(after.status, before.status);
    assert.equal(after.stop_review.consecutive_downgrades, 3);
    assert.equal(
      after.stop_review.last_reviewed_commit,
      before.stop_review.last_reviewed_commit,
    );
  });
});

// ---------------------------------------------------------------------------
// BLOCK escalation note
// ---------------------------------------------------------------------------

describe("applyVerdictToPlanState — BLOCK escalation", () => {
  it("emits escalation note after 3 consecutive same-fingerprint BLOCKs", () => {
    const { statePath, state } = makeStateAtAwaiting();
    const item = reviewItemFor(state, statePath);
    const review = { reason: "BLOCK: same finding text repeated" };

    let last;
    for (let i = 0; i < 3; i += 1) {
      last = applyVerdictToPlanState(item, STOP_REVIEW_OUTCOME.BLOCK, review);
    }
    assert.match(last.plannerDirective, /\[plan-runner: replay /);
    assert.match(last.escalationNote, /3회 연속 BLOCK/);
  });

  it("does not emit escalation when fingerprints differ", () => {
    const { statePath, state } = makeStateAtAwaiting();
    const item = reviewItemFor(state, statePath);

    applyVerdictToPlanState(item, STOP_REVIEW_OUTCOME.BLOCK, {
      reason: "BLOCK: first finding",
    });
    const second = applyVerdictToPlanState(item, STOP_REVIEW_OUTCOME.BLOCK, {
      reason: "BLOCK: completely different finding",
    });
    assert.equal(second.escalationNote, "");
  });
});
