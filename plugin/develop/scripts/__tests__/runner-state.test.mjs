import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEV_REVIEW_PHASE,
  SCHEMA_VERSION,
  STATUS,
  STOP_REVIEW_PHASE,
  TERMINAL_STATUSES,
  assertExpectedStatus,
  bumpConsecutiveDowngrades,
  bumpDevReviewRound,
  clearConsecutiveDowngrades,
  clearPlanBlockStreak,
  createInitialState,
  deriveStatePathFromPlanPath,
  deriveWorktreePathFromBranch,
  fingerprintBlockReason,
  loadState,
  migrateV1ToV2,
  recordPlanBlock,
  saveState,
  setDevReviewPhase,
  setLastReviewedCommit,
  setStopReviewArmed,
  setStopReviewPhase,
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
  it("produces a fresh state in PREPARING with armed=false and no phases", () => {
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
    assert.equal(state.status, STATUS.PREPARING);
    assert.equal(state.stop_review.armed, false);
    assert.equal(state.stop_review.phase, null);
    assert.equal(state.dev_review.phase, null);
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
    assert.equal(loaded.status, STATUS.PREPARING);
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

  it("mirrors the saved file to <state>.bak", () => {
    const state = createInitialState({
      planSlug: "bak",
      planPath: "/p/bak.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/bak",
      worktreePath: "/p/worktrees/feat-bak",
    });
    const file = path.join(tmpDir, "bak", ".runner-state.json");
    saveState(file, state);
    const bak = `${file}.bak`;
    assert.equal(fs.existsSync(bak), true, ".bak should exist after save");
    assert.equal(
      fs.readFileSync(bak, "utf8"),
      fs.readFileSync(file, "utf8"),
      ".bak content should match the canonical file",
    );
  });

  it("loadState falls back to .bak when the main file is corrupt", () => {
    const state = createInitialState({
      planSlug: "fallback",
      planPath: "/p/fallback.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/fallback",
      worktreePath: "/p/worktrees/feat-fallback",
    });
    const file = path.join(tmpDir, "fallback", ".runner-state.json");
    saveState(file, state);
    // Corrupt the main file but leave .bak intact.
    fs.writeFileSync(file, "{ this is not valid JSON", "utf8");
    const loaded = loadState(file);
    assert.equal(loaded.plan_slug, "fallback");
    assert.equal(loaded.status, STATUS.PREPARING);
  });

  it("loadState surfaces the parse error if .bak is also unusable", () => {
    const state = createInitialState({
      planSlug: "doublebad",
      planPath: "/p/doublebad.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/doublebad",
      worktreePath: "/p/worktrees/feat-doublebad",
    });
    const file = path.join(tmpDir, "doublebad", ".runner-state.json");
    saveState(file, state);
    fs.writeFileSync(file, "{ corrupt", "utf8");
    fs.writeFileSync(`${file}.bak`, "{ also corrupt", "utf8");
    assert.throws(() => loadState(file), /failed to parse JSON/);
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
    transitionStatus(s, STATUS.DEV_REVIEWING);
    transitionStatus(s, STATUS.CLOSING);
    transitionStatus(s, STATUS.MERGED);
    assert.equal(s.status, STATUS.MERGED);
  });

  // The dev-review sub-states (rework / Q&A / awaiting) are no longer
  // separate statuses in v2 — they are phase mutations on DEV_REVIEWING.
  // transitionStatus only handles top-level Step boundaries.
  it("DEV_REVIEWING self-edge is allowed (re-entry on round bump)", () => {
    const s = fresh();
    s.status = STATUS.DEV_REVIEWING;
    transitionStatus(s, STATUS.DEV_REVIEWING);
    assert.equal(s.status, STATUS.DEV_REVIEWING);
  });

  // Regression: after a BLOCK, the gate stays armed via stop_review.phase
  // (BLOCKED → ARMED → BLOCKED). The status stays at DISPATCHING the entire
  // time and only flips to DEV_REVIEWING once the Stop hook ALLOWs.
  it("DISPATCHING self-edge is allowed (gate cycles via phase)", () => {
    const s = fresh();
    s.status = STATUS.DISPATCHING;
    transitionStatus(s, STATUS.DISPATCHING);
    transitionStatus(s, STATUS.DEV_REVIEWING);
    assert.equal(s.status, STATUS.DEV_REVIEWING);
  });

  it("rejects illegal jumps (e.g. preparing → closing)", () => {
    const s = fresh();
    assert.throws(() => transitionStatus(s, STATUS.CLOSING));
  });

  it("rejects unknown statuses", () => {
    const s = fresh();
    assert.throws(() => transitionStatus(s, "running"));
  });

  it("MERGED is terminal — no transitions out", () => {
    const s = fresh();
    s.status = STATUS.MERGED;
    assert.throws(() => transitionStatus(s, STATUS.CLOSING));
    assert.throws(() => transitionStatus(s, STATUS.PREPARING));
  });

  it("MERGED is the only terminal status", () => {
    assert.equal(TERMINAL_STATUSES.has(STATUS.MERGED), true);
    assert.equal(TERMINAL_STATUSES.has(STATUS.CLOSING), false);
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
    assert.equal(assertExpectedStatus(s, STATUS.PREPARING), s);
  });

  it("accepts an array of expected statuses", () => {
    const s = fresh();
    s.status = STATUS.DEV_REVIEWING;
    assertExpectedStatus(s, [STATUS.DEV_REVIEWING, STATUS.CLOSING]);
  });

  it("throws with a useful message when status mismatches", () => {
    const s = fresh();
    s.status = STATUS.DISPATCHING;
    assert.throws(
      () => assertExpectedStatus(s, STATUS.DEV_REVIEWING, "Step 4"),
      /dispatching.*expected "dev_reviewing".*Step 4/s,
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

// ---------------------------------------------------------------------------
// v1 → v2 migration
// ---------------------------------------------------------------------------

describe("migrateV1ToV2", () => {
  // Every v1 status is mapped to a (status, phase) pair. The table here
  // mirrors lib/runner-state.mjs:V1_TO_V2 and exists to lock the contract.
  const cases = [
    ["validating",            STATUS.PREPARING,      null,                          null],
    ["dispatching",           STATUS.PREPARING,      null,                          null],
    ["awaiting_stop_review",  STATUS.DISPATCHING,    STOP_REVIEW_PHASE.ARMED,       null],
    ["stop_review_blocked",   STATUS.DISPATCHING,    STOP_REVIEW_PHASE.BLOCKED,     null],
    ["awaiting_dev_review",   STATUS.DEV_REVIEWING,  null,                          DEV_REVIEW_PHASE.AWAITING],
    ["rework_in_progress",    STATUS.DEV_REVIEWING,  null,                          DEV_REVIEW_PHASE.REWORK],
    ["qa_pending",            STATUS.DEV_REVIEWING,  null,                          DEV_REVIEW_PHASE.QA],
    ["approved",              STATUS.CLOSING,        null,                          null],
    ["merged",                STATUS.MERGED,         null,                          null],
  ];

  function v1State(status) {
    return {
      schema_version: 1,
      plan_slug: "x",
      plan_path: "/p/x.plan.md",
      owner_agent: "a",
      base_branch: "main",
      task_branch: "feat/x",
      worktree_path: "/p/worktrees/feat-x",
      status,
      stop_review: {
        armed: false,
        last_result: null,
        last_reviewed_commit: null,
        block_history: [],
      },
      dev_review: { current_round: 0, last_feedback_path: null },
      session_id: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    };
  }

  for (const [v1Status, v2Status, stopPhase, devPhase] of cases) {
    it(`maps ${v1Status} → status=${v2Status} stopPhase=${stopPhase} devPhase=${devPhase}`, () => {
      const s = v1State(v1Status);
      migrateV1ToV2(s);
      assert.equal(s.schema_version, SCHEMA_VERSION);
      assert.equal(s.status, v2Status);
      assert.equal(s.stop_review.phase, stopPhase);
      assert.equal(s.dev_review.phase, devPhase);
    });
  }

  it("is idempotent — re-running on a v2 state is a no-op", () => {
    const s = v1State("awaiting_dev_review");
    migrateV1ToV2(s);
    const after1 = JSON.stringify(s);
    migrateV1ToV2(s);
    assert.equal(JSON.stringify(s), after1);
  });

  it("preserves dev_review.current_round across migration", () => {
    const s = v1State("rework_in_progress");
    s.dev_review.current_round = 3;
    s.dev_review.last_feedback_path = "/p/x/r3/feedback.json";
    migrateV1ToV2(s);
    assert.equal(s.dev_review.current_round, 3);
    assert.equal(s.dev_review.last_feedback_path, "/p/x/r3/feedback.json");
  });

  it("rejects unknown v1 status values", () => {
    const s = v1State("???");
    assert.throws(() => migrateV1ToV2(s), /unknown value/);
  });

  it("auto-fires from validateState on a v1 state", () => {
    const s = v1State("approved");
    validateState(s);
    assert.equal(s.schema_version, SCHEMA_VERSION);
    assert.equal(s.status, STATUS.CLOSING);
  });

  it("loadState transparently migrates a v1 file on disk", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v1-migrate-"));
    try {
      const file = path.join(tmp, ".runner-state.json");
      fs.writeFileSync(file, JSON.stringify(v1State("awaiting_dev_review")), "utf8");
      const loaded = loadState(file);
      assert.equal(loaded.schema_version, SCHEMA_VERSION);
      assert.equal(loaded.status, STATUS.DEV_REVIEWING);
      assert.equal(loaded.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("setStopReviewPhase / setDevReviewPhase", () => {
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

  it("walks stop-review phase: null → ARMED → BLOCKED → ARMED → PASSED", () => {
    const s = fresh();
    setStopReviewPhase(s, STOP_REVIEW_PHASE.ARMED);
    setStopReviewPhase(s, STOP_REVIEW_PHASE.BLOCKED);
    setStopReviewPhase(s, STOP_REVIEW_PHASE.ARMED);
    setStopReviewPhase(s, STOP_REVIEW_PHASE.PASSED);
    assert.equal(s.stop_review.phase, STOP_REVIEW_PHASE.PASSED);
  });

  it("walks dev-review phase: null → AWAITING → REWORK → AWAITING → QA → AWAITING", () => {
    const s = fresh();
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.REWORK);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.QA);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    assert.equal(s.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
  });

  it("rejects illegal phase jumps", () => {
    const s = fresh();
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.REWORK);
    // REWORK → QA is not allowed (must go through AWAITING).
    assert.throws(() => setDevReviewPhase(s, DEV_REVIEW_PHASE.QA));
  });

  it("setting phase to null is always allowed (status leaving the block)", () => {
    const s = fresh();
    setStopReviewPhase(s, STOP_REVIEW_PHASE.ARMED);
    setStopReviewPhase(s, null);
    assert.equal(s.stop_review.phase, null);
  });

  it("rejects unknown phase values", () => {
    const s = fresh();
    assert.throws(() => setStopReviewPhase(s, "frozen"));
    assert.throws(() => setDevReviewPhase(s, "thinking"));
  });
});

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

// ---------------------------------------------------------------------------
// consecutive_downgrades (Phase 4)
// ---------------------------------------------------------------------------

describe("bumpConsecutiveDowngrades / clearConsecutiveDowngrades", () => {
  function freshState() {
    return createInitialState({
      planSlug: "cd",
      planPath: "/p/cd.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/cd",
      worktreePath: "/p/worktrees/feat-cd",
    });
  }

  it("treats a missing field as 0 and writes the field on first bump", () => {
    const s = freshState();
    delete s.stop_review.consecutive_downgrades;
    const n = bumpConsecutiveDowngrades(s);
    assert.equal(n, 1);
    assert.equal(s.stop_review.consecutive_downgrades, 1);
  });

  it("increments on each call", () => {
    const s = freshState();
    bumpConsecutiveDowngrades(s);
    bumpConsecutiveDowngrades(s);
    bumpConsecutiveDowngrades(s);
    assert.equal(s.stop_review.consecutive_downgrades, 3);
  });

  it("clear resets to 0", () => {
    const s = freshState();
    bumpConsecutiveDowngrades(s);
    bumpConsecutiveDowngrades(s);
    clearConsecutiveDowngrades(s);
    assert.equal(s.stop_review.consecutive_downgrades, 0);
  });

  it("legacy state files without the field validate and load fine", () => {
    // A state file written before this helper existed has no
    // consecutive_downgrades. validateState must not require it.
    const s = freshState();
    delete s.stop_review.consecutive_downgrades;
    assert.doesNotThrow(() => validateState(s));
    // And clear is a no-op on the missing field, leaving 0.
    clearConsecutiveDowngrades(s);
    assert.equal(s.stop_review.consecutive_downgrades, 0);
  });
});
