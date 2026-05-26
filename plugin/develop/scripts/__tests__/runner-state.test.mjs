import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEV_REVIEW_PHASE,
  loadState,
  saveState,
  setDevReviewFeedbackPath,
  setDevReviewPhase,
} from "../lib/runner-state.mjs";

// Plain-object fixture matching the slim plan-state schema. The runner skill
// builds this in its Step 1 (no library helper anymore); these tests do the
// same shape inline.
function makeState(slug = "x") {
  return {
    plan_slug: slug,
    plan_path: `/p/${slug}.plan.md`,
    owner_agent: "general-developer",
    base_branch: "main",
    task_branch: `feat/${slug}`,
    worktree_path: `/p/worktrees/feat-${slug}`,
    dev_review: { phase: null, last_feedback_path: null },
  };
}

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
    const state = makeState("rt");
    const file = path.join(tmpDir, "rt", ".runner-state.json");
    saveState(file, state);
    assert.equal(fs.existsSync(file), true);

    const loaded = loadState(file);
    assert.equal(loaded.plan_slug, "rt");
    assert.equal(loaded.task_branch, "feat/rt");
    assert.equal(loaded.dev_review.phase, null);
  });

  it("creates parent directories on first save", () => {
    const state = makeState("deep");
    const file = path.join(tmpDir, "a", "b", "c", "deep", ".runner-state.json");
    saveState(file, state);
    assert.equal(fs.existsSync(file), true);
  });

  it("loadState throws on corrupt JSON", () => {
    const state = makeState("corrupt");
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
  it("walks dev-review phase through every value", () => {
    const s = makeState();
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
    const s = makeState();
    assert.throws(() => setDevReviewPhase(s, "thinking"));
    assert.throws(() => setDevReviewPhase(s, "rework_pending"));
  });

  it("allows arbitrary direction (no transition table — Stop hook race is gone)", () => {
    const s = makeState();
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
    const s = makeState();
    setDevReviewFeedbackPath(s, "/p/x/dev-review/feedback.json");
    assert.equal(s.dev_review.last_feedback_path, "/p/x/dev-review/feedback.json");
    setDevReviewFeedbackPath(s, null);
    assert.equal(s.dev_review.last_feedback_path, null);
  });
});
