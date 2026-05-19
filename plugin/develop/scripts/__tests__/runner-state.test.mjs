import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEV_REVIEW_PHASE,
  createInitialState,
  deriveStatePathFromPlanPath,
  deriveWorktreePathFromBranch,
  loadState,
  saveState,
  setDevReviewFeedbackPath,
  setDevReviewPhase,
  stateFileExists,
  tryLoadState,
} from "../lib/runner-state.mjs";

// ---------------------------------------------------------------------------
// Path derivation
// ---------------------------------------------------------------------------

describe("deriveStatePathFromPlanPath", () => {
  it("strips .plan.md and mirrors the plan directory", () => {
    const { stateDir, statePath, stem } = deriveStatePathFromPlanPath(
      "/repo/plans/login-frontend.plan.md",
    );
    assert.equal(stem, "login-frontend");
    assert.ok(stateDir.endsWith("/repo/plans/login-frontend"));
    assert.ok(statePath.endsWith("/repo/plans/login-frontend/.runner-state.json"));
  });

  it("preserves nested plan directories so siblings do not collide", () => {
    const a = deriveStatePathFromPlanPath("/repo/plans/auth/login.plan.md");
    const b = deriveStatePathFromPlanPath("/repo/plans/login.plan.md");
    assert.notEqual(a.statePath, b.statePath);
    assert.ok(a.statePath.endsWith("/repo/plans/auth/login/.runner-state.json"));
    assert.ok(b.statePath.endsWith("/repo/plans/login/.runner-state.json"));
  });

  it("treats a bare plan.md as the directory's canonical plan", () => {
    const { stateDir, statePath, stem } = deriveStatePathFromPlanPath(
      "/repo/plans/wanted-design-system-mvp/plan.md",
    );
    assert.equal(stem, "wanted-design-system-mvp");
    assert.ok(stateDir.endsWith("/repo/plans/wanted-design-system-mvp"));
    assert.ok(statePath.endsWith("/repo/plans/wanted-design-system-mvp/.runner-state.json"));
  });

  it("keeps plan.md and front.plan.md as siblings under the same parent", () => {
    const main = deriveStatePathFromPlanPath("/repo/plans/wanted-design-system-mvp/plan.md");
    const front = deriveStatePathFromPlanPath("/repo/plans/wanted-design-system-mvp/front.plan.md");
    assert.notEqual(main.statePath, front.statePath);
    assert.ok(main.statePath.endsWith("/repo/plans/wanted-design-system-mvp/.runner-state.json"));
    assert.ok(front.statePath.endsWith("/repo/plans/wanted-design-system-mvp/front/.runner-state.json"));
  });

  it("falls back to the plain filename stem when not .plan.md", () => {
    const { stem } = deriveStatePathFromPlanPath("/repo/plans/notes.md");
    assert.equal(stem, "notes");
    const planMd = deriveStatePathFromPlanPath("/repo/plans/foo/plan.md");
    assert.equal(planMd.stem, "foo");
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
// createInitialState — slim 7-field schema
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("produces a state with the 7 identity fields and null dev_review.phase", () => {
    const state = createInitialState({
      planSlug: "login-frontend",
      planPath: "/repo/plans/login-frontend.plan.md",
      ownerAgent: "frontend-developer",
      baseBranch: "main",
      taskBranch: "feat/login-frontend",
      worktreePath: "/repo/worktrees/feat-login-frontend",
    });
    assert.equal(state.plan_slug, "login-frontend");
    assert.equal(state.owner_agent, "frontend-developer");
    assert.equal(state.base_branch, "main");
    assert.equal(state.task_branch, "feat/login-frontend");
    assert.equal(state.dev_review.phase, null);
    assert.equal(state.dev_review.last_feedback_path, null);
    // Stop-review and status fields must NOT be present in the slim schema.
    assert.equal(state.status, undefined);
    assert.equal(state.stop_review, undefined);
    assert.equal(state.schema_version, undefined);
    assert.equal(state.session_id, undefined);
    assert.equal(state.created_at, undefined);
    assert.equal(state.updated_at, undefined);
  });

  it("requires every identity field", () => {
    assert.throws(() => createInitialState({}));
    assert.throws(() => createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      // baseBranch missing
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    }));
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
    assert.equal(loaded.task_branch, "feat/rt");
    assert.equal(loaded.dev_review.phase, null);
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

  it("tryLoadState returns null when file is missing", () => {
    const file = path.join(tmpDir, "missing", ".runner-state.json");
    assert.equal(tryLoadState(file), null);
  });

  it("loadState throws on corrupt JSON", () => {
    const state = createInitialState({
      planSlug: "corrupt",
      planPath: "/p/corrupt.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/corrupt",
      worktreePath: "/p/worktrees/feat-corrupt",
    });
    const file = path.join(tmpDir, "corrupt", ".runner-state.json");
    saveState(file, state);
    fs.writeFileSync(file, "{ corrupt", "utf8");
    assert.throws(() => loadState(file), /failed to parse JSON/);
  });

  it("tolerates loading legacy schema files (extra fields ignored)", () => {
    // A pre-removal state file with status/stop_review/etc still parses; the
    // slim runner-state.mjs just ignores the extra fields.
    const file = path.join(tmpDir, "legacy", ".runner-state.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({
      schema_version: 2,
      plan_slug: "legacy",
      plan_path: "/p/legacy.plan.md",
      owner_agent: "a",
      base_branch: "main",
      task_branch: "feat/legacy",
      worktree_path: "/p/worktrees/feat-legacy",
      status: "dev_reviewing",
      stop_review: { armed: false, phase: null, block_history: [] },
      dev_review: { phase: "awaiting", last_feedback_path: null },
    }, null, 2));
    const loaded = loadState(file);
    assert.equal(loaded.plan_slug, "legacy");
    assert.equal(loaded.dev_review.phase, "awaiting");
  });
});

// ---------------------------------------------------------------------------
// dev_review.phase mutators
// ---------------------------------------------------------------------------

describe("setDevReviewPhase", () => {
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

  it("walks dev-review phase through every value", () => {
    const s = fresh();
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    assert.equal(s.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.REWORK);
    assert.equal(s.dev_review.phase, DEV_REVIEW_PHASE.REWORK);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.QA);
    assert.equal(s.dev_review.phase, DEV_REVIEW_PHASE.QA);
    setDevReviewPhase(s, null);
    assert.equal(s.dev_review.phase, null);
  });

  it("rejects unknown phase values", () => {
    const s = fresh();
    assert.throws(() => setDevReviewPhase(s, "thinking"));
    assert.throws(() => setDevReviewPhase(s, "rework_pending"));
  });

  it("allows arbitrary direction (no transition table — Stop hook race is gone)", () => {
    const s = fresh();
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.REWORK);
    // REWORK → QA directly. The previous v2 transition table forbade this; the
    // slim schema only validates the value, not the edge.
    setDevReviewPhase(s, DEV_REVIEW_PHASE.QA);
    assert.equal(s.dev_review.phase, DEV_REVIEW_PHASE.QA);
  });
});

describe("setDevReviewFeedbackPath", () => {
  it("stores feedback path on the state", () => {
    const s = createInitialState({
      planSlug: "x",
      planPath: "/p/x.plan.md",
      ownerAgent: "a",
      baseBranch: "main",
      taskBranch: "feat/x",
      worktreePath: "/p/worktrees/feat-x",
    });
    setDevReviewFeedbackPath(s, "/p/x/dev-review/feedback.json");
    assert.equal(s.dev_review.last_feedback_path, "/p/x/dev-review/feedback.json");
    setDevReviewFeedbackPath(s, null);
    assert.equal(s.dev_review.last_feedback_path, null);
  });
});
