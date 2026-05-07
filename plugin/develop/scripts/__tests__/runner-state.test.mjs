import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  SCHEMA_VERSION,
  STATUS,
  TERMINAL_STATUSES,
  assertExpectedStatus,
  bumpDevReviewRound,
  clearPlanBlockStreak,
  createInitialState,
  deriveStatePathFromPlanPath,
  deriveWorktreePathFromBranch,
  fingerprintBlockReason,
  loadState,
  recordPlanBlock,
  saveState,
  setLastReviewedCommit,
  setStopReviewArmed,
  stateFileExists,
  transitionStatus,
  tryLoadState,
  validateState,
} from "../lib/runner-state.mjs";

// ---------------------------------------------------------------------------
// Path derivation
// ---------------------------------------------------------------------------

describe("deriveStatePathFromPlanPath", () => {
  // We compare with endsWith so the tests work on both POSIX (where absolute
  // paths start with "/") and Windows (where absoluteNormalizePath prefixes
  // the drive letter, e.g. "C:/repo/...").

  it("strips .plan.md and mirrors the plan directory", () => {
    const { stateDir, statePath, stem } = deriveStatePathFromPlanPath(
      "/repo/plans/login-frontend.plan.md",
    );
    assert.equal(stem, "login-frontend");
    assert.ok(
      stateDir.endsWith("/repo/plans/login-frontend"),
      `stateDir was: ${stateDir}`,
    );
    assert.ok(
      statePath.endsWith("/repo/plans/login-frontend/.runner-state.json"),
      `statePath was: ${statePath}`,
    );
  });

  it("preserves nested plan directories so siblings do not collide", () => {
    const a = deriveStatePathFromPlanPath("/repo/plans/auth/login.plan.md");
    const b = deriveStatePathFromPlanPath("/repo/plans/login.plan.md");
    assert.notEqual(a.statePath, b.statePath);
    assert.ok(a.statePath.endsWith("/repo/plans/auth/login/.runner-state.json"));
    assert.ok(b.statePath.endsWith("/repo/plans/login/.runner-state.json"));
  });

  it("falls back to the plain filename stem when not .plan.md", () => {
    const { stem } = deriveStatePathFromPlanPath("/repo/plans/notes.md");
    assert.equal(stem, "notes");
  });

  it("rejects empty stems", () => {
    assert.throws(() => deriveStatePathFromPlanPath("/repo/.plan.md"));
  });
});

describe("deriveWorktreePathFromBranch", () => {
  it("replaces slashes with dashes", () => {
    const out = deriveWorktreePathFromBranch("/repo", "feat/login-frontend");
    assert.ok(out.endsWith("/repo/worktrees/feat-login-frontend"));
  });

  it("keeps simple branches intact", () => {
    const out = deriveWorktreePathFromBranch("/repo", "main");
    assert.ok(out.endsWith("/repo/worktrees/main"));
  });
});

// ---------------------------------------------------------------------------
// Initial state + validation
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("produces a schema-v1 state in VALIDATING with armed=false", () => {
    const state = createInitialState({
      planSlug: "login-frontend",
      planPath: "/repo/plans/login-frontend.plan.md",
      ownerAgent: "frontend-developer",
      baseBranch: "main",
      taskBranch: "feat/login-frontend",
      worktreePath: "/repo/worktrees/feat-login-frontend",
      sessionId: "sess-1",
    });
    assert.equal(state.schema_version, SCHEMA_VERSION);
    assert.equal(state.status, STATUS.VALIDATING);
    assert.equal(state.stop_review.armed, false);
    assert.deepEqual(state.stop_review.block_history, []);
    assert.equal(state.dev_review.current_round, 0);
    assert.equal(state.session_id, "sess-1");
    // Timestamps populated.
    assert.ok(state.created_at);
    assert.ok(state.updated_at);
  });

  it("requires every identity field", () => {
    assert.throws(() => createInitialState({}));
  });
});

describe("validateState", () => {
  function freshState() {
    return createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
  }

  it("accepts a freshly-created state", () => {
    const s = freshState();
    assert.equal(validateState(s), s);
  });

  it("rejects unknown schema_version (forces explicit migration)", () => {
    const s = freshState();
    s.schema_version = 99;
    assert.throws(() => validateState(s), /schema_version 99/);
  });

  it("rejects unknown status", () => {
    const s = freshState();
    s.status = "halfway";
    assert.throws(() => validateState(s), /unknown status/);
  });

  it("rejects missing stop_review block", () => {
    const s = freshState();
    delete s.stop_review;
    assert.throws(() => validateState(s));
  });
});

// ---------------------------------------------------------------------------
// Persistence (atomic write round-trip)
// ---------------------------------------------------------------------------

describe("saveState / loadState", () => {
  let tmpDir;
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-state-test-"));
  });
  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it("round-trips a state through disk", () => {
    const state = createInitialState({
      planSlug: "rt",
      planPath: "/p/rt.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/rt",
      worktreePath: "/p/worktrees/feat-rt",
    });
    const file = path.join(tmpDir, "rt", ".runner-state.json");
    saveState(file, state);
    assert.equal(stateFileExists(file), true);

    const loaded = loadState(file);
    assert.equal(loaded.plan_slug, "rt");
    assert.equal(loaded.status, STATUS.VALIDATING);
  });

  it("creates parent directories on first save", () => {
    const state = createInitialState({
      planSlug: "deep",
      planPath: "/p/a/b/c/deep.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/deep",
      worktreePath: "/p/worktrees/feat-deep",
    });
    const file = path.join(tmpDir, "a", "b", "c", "deep", ".runner-state.json");
    saveState(file, state);
    assert.equal(fs.existsSync(file), true);
  });

  it("bumps updated_at on every save", async () => {
    const state = createInitialState({
      planSlug: "bump",
      planPath: "/p/bump.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/bump",
      worktreePath: "/p/worktrees/feat-bump",
    });
    const file = path.join(tmpDir, "bump", ".runner-state.json");
    saveState(file, state);
    const before = state.updated_at;
    // Force a measurable gap so the ISO timestamps differ.
    await new Promise((r) => setTimeout(r, 5));
    saveState(file, state);
    assert.notEqual(state.updated_at, before);
  });

  it("tryLoadState returns null when file is missing", () => {
    const file = path.join(tmpDir, "missing", ".runner-state.json");
    assert.equal(tryLoadState(file), null);
  });

  it("does not leave a half-written file when validation fails", () => {
    const broken = createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
    broken.status = "totally-bogus";
    const file = path.join(tmpDir, "broken", ".runner-state.json");
    assert.throws(() => saveState(file, broken));
    assert.equal(fs.existsSync(file), false);
  });
});

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

describe("transitionStatus", () => {
  function fresh() {
    return createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
  }

  it("walks the canonical happy path", () => {
    const s = fresh();
    transitionStatus(s, STATUS.DISPATCHING);
    transitionStatus(s, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(s, STATUS.AWAITING_DEV_REVIEW);
    transitionStatus(s, STATUS.APPROVED);
    transitionStatus(s, STATUS.MERGED);
    assert.equal(s.status, STATUS.MERGED);
  });

  it("supports rework round-trips", () => {
    const s = fresh();
    s.status = STATUS.AWAITING_DEV_REVIEW;
    transitionStatus(s, STATUS.REWORK_IN_PROGRESS);
    transitionStatus(s, STATUS.AWAITING_DEV_REVIEW);
    assert.equal(s.status, STATUS.AWAITING_DEV_REVIEW);
  });

  it("supports stop-review BLOCK loop", () => {
    const s = fresh();
    s.status = STATUS.AWAITING_STOP_REVIEW;
    transitionStatus(s, STATUS.STOP_REVIEW_BLOCKED);
    transitionStatus(s, STATUS.AWAITING_STOP_REVIEW);
    assert.equal(s.status, STATUS.AWAITING_STOP_REVIEW);
  });

  // Regression: after a BLOCK, the next plan-agent dispatch's commits go
  // through stop-review again while the state stays in STOP_REVIEW_BLOCKED
  // (the runner skill does not transition back to AWAITING_STOP_REVIEW between
  // re-dispatches). When that re-review ALLOWs, the Stop hook advances the
  // plan directly from STOP_REVIEW_BLOCKED to AWAITING_DEV_REVIEW.
  it("recovers from BLOCK directly into dev-review on the next ALLOW", () => {
    const s = fresh();
    s.status = STATUS.STOP_REVIEW_BLOCKED;
    transitionStatus(s, STATUS.AWAITING_DEV_REVIEW);
    assert.equal(s.status, STATUS.AWAITING_DEV_REVIEW);
  });

  it("rejects illegal jumps (e.g. validating → approved)", () => {
    const s = fresh();
    assert.throws(() => transitionStatus(s, STATUS.APPROVED));
  });

  it("rejects unknown statuses", () => {
    const s = fresh();
    assert.throws(() => transitionStatus(s, "running"));
  });

  it("MERGED is terminal — no transitions out", () => {
    const s = fresh();
    s.status = STATUS.MERGED;
    assert.throws(() => transitionStatus(s, STATUS.APPROVED));
    assert.throws(() => transitionStatus(s, STATUS.VALIDATING));
  });

  it("MERGED is the only terminal status", () => {
    assert.equal(TERMINAL_STATUSES.has(STATUS.MERGED), true);
    assert.equal(TERMINAL_STATUSES.has(STATUS.APPROVED), false);
  });
});

describe("assertExpectedStatus", () => {
  function fresh() {
    return createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
  }

  it("returns state when status matches a single expectation", () => {
    const s = fresh();
    assert.equal(assertExpectedStatus(s, STATUS.VALIDATING), s);
  });

  it("accepts an array of expected statuses", () => {
    const s = fresh();
    s.status = STATUS.AWAITING_DEV_REVIEW;
    assertExpectedStatus(s, [STATUS.AWAITING_DEV_REVIEW, STATUS.QA_PENDING]);
  });

  it("throws with a useful message when status mismatches", () => {
    const s = fresh();
    s.status = STATUS.AWAITING_STOP_REVIEW;
    assert.throws(
      () => assertExpectedStatus(s, STATUS.AWAITING_DEV_REVIEW, "Step 4"),
      /awaiting_stop_review.*expected "awaiting_dev_review".*Step 4/s,
    );
  });

  it("rejects unknown expected statuses", () => {
    const s = fresh();
    assert.throws(() => assertExpectedStatus(s, "running"), /unknown expected status/);
  });
});

// ---------------------------------------------------------------------------
// Stop-review helpers
// ---------------------------------------------------------------------------

describe("setStopReviewArmed / setLastReviewedCommit", () => {
  it("toggles armed coercing truthy/falsy", () => {
    const s = createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
    setStopReviewArmed(s, 1);
    assert.equal(s.stop_review.armed, true);
    setStopReviewArmed(s, 0);
    assert.equal(s.stop_review.armed, false);
  });

  it("records the reviewed SHA and outcome", () => {
    const s = createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
    setLastReviewedCommit(s, "abcdef0", "ALLOW");
    assert.equal(s.stop_review.last_reviewed_commit, "abcdef0");
    assert.equal(s.stop_review.last_result, "ALLOW");
  });
});

// ---------------------------------------------------------------------------
// Block history
// ---------------------------------------------------------------------------

describe("recordPlanBlock", () => {
  function fresh() {
    return createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
  }

  it("appends a new entry on first BLOCK", () => {
    const s = fresh();
    const r = recordPlanBlock(s, "ESLint failure on login.tsx:42");
    assert.equal(s.stop_review.block_history.length, 1);
    assert.equal(s.stop_review.block_history[0].count, 1);
    assert.equal(r.count, 1);
    assert.ok(s.stop_review.block_history[0].reason_excerpt.includes("ESLint"));
  });

  it("coalesces consecutive identical reasons (intra-line whitespace)", () => {
    const s = fresh();
    recordPlanBlock(s, "BLOCK: same  reason  here");
    const r = recordPlanBlock(s, "BLOCK:   same   reason   here");
    assert.equal(s.stop_review.block_history.length, 1);
    assert.equal(r.count, 2);
  });

  it("coalesces consecutive identical reasons (extra blank lines)", () => {
    const s = fresh();
    recordPlanBlock(s, "BLOCK: line1\n\nline2");
    const r = recordPlanBlock(s, "BLOCK: line1\n\n\n\nline2");
    assert.equal(s.stop_review.block_history.length, 1);
    assert.equal(r.count, 2);
  });

  it("starts a new entry when the fingerprint changes", () => {
    const s = fresh();
    recordPlanBlock(s, "reason A");
    recordPlanBlock(s, "reason B");
    assert.equal(s.stop_review.block_history.length, 2);
  });

  it("caps history length at 10", () => {
    const s = fresh();
    for (let i = 0; i < 15; i++) recordPlanBlock(s, `reason ${i}`);
    assert.equal(s.stop_review.block_history.length, 10);
  });
});

describe("clearPlanBlockStreak", () => {
  it("inserts an __allow__ separator so the next BLOCK starts a fresh streak", () => {
    const s = createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
    recordPlanBlock(s, "reason A");
    recordPlanBlock(s, "reason A");
    clearPlanBlockStreak(s);
    const r = recordPlanBlock(s, "reason A");
    assert.equal(r.count, 1);
  });

  it("is a no-op when there is no history", () => {
    const s = createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
    clearPlanBlockStreak(s);
    assert.deepEqual(s.stop_review.block_history, []);
  });
});

// ---------------------------------------------------------------------------
// Dev-review round bookkeeping
// ---------------------------------------------------------------------------

describe("bumpDevReviewRound", () => {
  it("increments and stores feedback path", () => {
    const s = createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
    bumpDevReviewRound(s, "/p/x/dev-review/r1/feedback.json");
    assert.equal(s.dev_review.current_round, 1);
    assert.equal(s.dev_review.last_feedback_path, "/p/x/dev-review/r1/feedback.json");
    bumpDevReviewRound(s, "/p/x/dev-review/r2/feedback.json");
    assert.equal(s.dev_review.current_round, 2);
  });
});

// ---------------------------------------------------------------------------
// Fingerprint stability
// ---------------------------------------------------------------------------

describe("fingerprintBlockReason", () => {
  it("ignores intra-line whitespace differences", () => {
    const a = fingerprintBlockReason("BLOCK: x  y");
    const b = fingerprintBlockReason("BLOCK:   x   y");
    assert.equal(a, b);
  });

  it("ignores extra blank lines between paragraphs", () => {
    const a = fingerprintBlockReason("para1\n\npara2");
    const b = fingerprintBlockReason("para1\n\n\n\npara2");
    assert.equal(a, b);
  });

  it("differentiates substantive content", () => {
    const a = fingerprintBlockReason("BLOCK: x");
    const b = fingerprintBlockReason("BLOCK: y");
    assert.notEqual(a, b);
  });
});
