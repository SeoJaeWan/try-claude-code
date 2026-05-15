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

// runner-state-cli is invoked as a child process — that is exactly how the
// runner skill calls it from Bash, and the goal of these tests is to lock
// the user-facing contract (exit code, stdout new-status line, stderr
// before→after format) rather than the internal helpers.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(SCRIPT_DIR, "..", "runner-state-cli.mjs");

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-state-cli-test-"));
});

after(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

let counter = 0;

// Build a fresh plan-state file in a unique sub-directory and return its
// absolute path. `target` accepts either a bare v2 status enum value or a
// `{ status, stopPhase, devPhase }` tuple to land on a specific sub-state.
function makeStateFile({ status = STATUS.PREPARING, mutate } = {}) {
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

  if (mutate) mutate(state);
  saveState(statePath, state);
  return statePath;
}

function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

// ---------------------------------------------------------------------------
// arm-for-dispatch
// ---------------------------------------------------------------------------

describe("runner-state-cli arm-for-dispatch", () => {
  it("transitions PREPARING → DISPATCHING + phase=ARMED", () => {
    const file = makeStateFile({ status: STATUS.PREPARING });
    const r = runCli("arm-for-dispatch", file);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /dispatching/);
    assert.match(r.stderr, /preparing.*→.*dispatching\/armed/);
    const after = loadState(file);
    assert.equal(after.status, STATUS.DISPATCHING);
    assert.equal(after.stop_review.phase, STOP_REVIEW_PHASE.ARMED);
    assert.equal(after.stop_review.armed, true);
  });

  it("re-arms from DISPATCHING + phase=BLOCKED (post-BLOCK redispatch path)", () => {
    const file = makeStateFile({
      status: { status: STATUS.DISPATCHING, stopPhase: STOP_REVIEW_PHASE.BLOCKED },
    });
    const r = runCli("arm-for-dispatch", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.status, STATUS.DISPATCHING);
    assert.equal(after.stop_review.phase, STOP_REVIEW_PHASE.ARMED);
    assert.equal(after.stop_review.armed, true);
  });

  it("rejects invocation from a non-dispatch status (e.g. closing)", () => {
    const file = makeStateFile({ status: STATUS.CLOSING });
    const r = runCli("arm-for-dispatch", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /assertExpectedStatus|status.*closing/i);
    assert.equal(loadState(file).status, STATUS.CLOSING);
  });
});

// ---------------------------------------------------------------------------
// rework lifecycle
// ---------------------------------------------------------------------------

describe("runner-state-cli begin-rework + rework-done", () => {
  it("begin-rework records feedback path and sets phase=rework", () => {
    const file = makeStateFile({ status: STATUS.DEV_REVIEWING });
    const feedback = path.join(path.dirname(file), "feedback.json");
    const r = runCli("begin-rework", file, feedback);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    // Status stays at DEV_REVIEWING — only the phase moves.
    assert.equal(after.status, STATUS.DEV_REVIEWING);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.REWORK);
    assert.match(after.dev_review.last_feedback_path, /feedback\.json$/);
  });

  it("begin-rework requires a feedback path", () => {
    const file = makeStateFile({ status: STATUS.DEV_REVIEWING });
    const r = runCli("begin-rework", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /feedback-path/);
  });

  it("rework-done returns phase to AWAITING (status unchanged)", () => {
    const file = makeStateFile({
      status: { status: STATUS.DEV_REVIEWING, devPhase: DEV_REVIEW_PHASE.REWORK },
    });
    const r = runCli("rework-done", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.status, STATUS.DEV_REVIEWING);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
  });

  it("rework-done rejects from phase=awaiting (no rework in flight)", () => {
    const file = makeStateFile({ status: STATUS.DEV_REVIEWING });
    const r = runCli("rework-done", file);
    assert.equal(r.status, 1);
    const after = loadState(file);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
  });
});

// ---------------------------------------------------------------------------
// QA loop
// ---------------------------------------------------------------------------

describe("runner-state-cli mark-qa-pending + qa-resolved", () => {
  it("mark-qa-pending → phase=qa", () => {
    const file = makeStateFile({ status: STATUS.DEV_REVIEWING });
    const r = runCli("mark-qa-pending", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.status, STATUS.DEV_REVIEWING);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.QA);
  });

  it("qa-resolved → phase=awaiting", () => {
    const file = makeStateFile({
      status: { status: STATUS.DEV_REVIEWING, devPhase: DEV_REVIEW_PHASE.QA },
    });
    const r = runCli("qa-resolved", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.status, STATUS.DEV_REVIEWING);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
  });

  it("qa-resolved rejects when phase is not qa", () => {
    const file = makeStateFile({ status: STATUS.DEV_REVIEWING });
    const r = runCli("qa-resolved", file);
    assert.equal(r.status, 1);
  });
});

// ---------------------------------------------------------------------------
// approval + merge
// ---------------------------------------------------------------------------

describe("runner-state-cli mark-approved + mark-merged", () => {
  it("mark-approved transitions DEV_REVIEWING → CLOSING (clears dev_review.phase)", () => {
    const file = makeStateFile({ status: STATUS.DEV_REVIEWING });
    const r = runCli("mark-approved", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.status, STATUS.CLOSING);
    assert.equal(after.dev_review.phase, null);
  });

  it("mark-approved rejects when phase is not awaiting", () => {
    const file = makeStateFile({
      status: { status: STATUS.DEV_REVIEWING, devPhase: DEV_REVIEW_PHASE.REWORK },
    });
    const r = runCli("mark-approved", file);
    assert.equal(r.status, 1);
  });

  it("mark-merged transitions CLOSING → MERGED", () => {
    const file = makeStateFile({ status: STATUS.CLOSING });
    const r = runCli("mark-merged", file);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(loadState(file).status, STATUS.MERGED);
  });

  it("mark-merged rejects from a non-closing status", () => {
    const file = makeStateFile({ status: STATUS.DEV_REVIEWING });
    const r = runCli("mark-merged", file);
    assert.equal(r.status, 1);
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("runner-state-cli reset", () => {
  it("dry-run lists targets without deleting", () => {
    const file = makeStateFile({ status: STATUS.MERGED });
    const dir = path.dirname(file);
    fs.writeFileSync(path.join(dir, "feedback.json"), "{}");
    fs.writeFileSync(path.join(dir, "feedback-round-2.json"), "{}");
    const r = runCli("reset", file);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /dry-run/);
    // Files all still present.
    assert.equal(fs.existsSync(file), true);
    assert.equal(fs.existsSync(path.join(dir, "feedback.json")), true);
    assert.equal(fs.existsSync(path.join(dir, "feedback-round-2.json")), true);
  });

  it("--confirm removes state file and feedback siblings", () => {
    const file = makeStateFile({ status: STATUS.MERGED });
    const dir = path.dirname(file);
    fs.writeFileSync(path.join(dir, "feedback.json"), "{}");
    fs.writeFileSync(path.join(dir, "feedback-round-3.json"), "{}");
    // An unrelated file must NOT be touched.
    fs.writeFileSync(path.join(dir, "notes.md"), "keep me");
    const r = runCli("reset", file, "--confirm");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.existsSync(file), false);
    assert.equal(fs.existsSync(path.join(dir, "feedback.json")), false);
    assert.equal(fs.existsSync(path.join(dir, "feedback-round-3.json")), false);
    assert.equal(fs.existsSync(path.join(dir, "notes.md")), true);
  });

  it("rejects reset on a plan that is not yet merged", () => {
    const file = makeStateFile({ status: STATUS.CLOSING });
    const r = runCli("reset", file, "--confirm");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /merged/);
    // State untouched.
    assert.equal(fs.existsSync(file), true);
    assert.equal(loadState(file).status, STATUS.CLOSING);
  });
});

// ---------------------------------------------------------------------------
// Argument handling
// ---------------------------------------------------------------------------

describe("runner-state-cli argument handling", () => {
  it("prints usage when called with no arguments", () => {
    const r = runCli();
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage:/);
  });

  it("rejects unknown subcommands", () => {
    const file = makeStateFile({ status: STATUS.PREPARING });
    const r = runCli("teleport", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown subcommand/);
  });

  it("rejects missing state path", () => {
    const r = runCli("arm-for-dispatch");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /<state-path>/);
  });

  it("rejects a state path that does not exist", () => {
    const r = runCli("arm-for-dispatch", path.join(tmpDir, "no-such-file.json"));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not found/);
  });
});
