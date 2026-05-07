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
  loadState,
  saveState,
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
// absolute path. `setup` lets the test pre-position status / fields.
function makeStateFile({ status = STATUS.VALIDATING, mutate } = {}) {
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
  // Walk the state machine forward so we land on the requested status. Saves
  // tests from re-encoding ALLOWED_TRANSITIONS by hand.
  const path1 = [
    STATUS.VALIDATING,
    STATUS.DISPATCHING,
    STATUS.AWAITING_STOP_REVIEW,
    STATUS.AWAITING_DEV_REVIEW,
    STATUS.APPROVED,
    STATUS.MERGED,
  ];
  const idx = path1.indexOf(status);
  if (idx > 0) {
    for (let i = 1; i <= idx; i += 1) {
      transitionStatus(state, path1[i]);
    }
  } else if (status === STATUS.STOP_REVIEW_BLOCKED) {
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(state, STATUS.STOP_REVIEW_BLOCKED);
  } else if (status === STATUS.REWORK_IN_PROGRESS) {
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(state, STATUS.AWAITING_DEV_REVIEW);
    transitionStatus(state, STATUS.REWORK_IN_PROGRESS);
  } else if (status === STATUS.QA_PENDING) {
    transitionStatus(state, STATUS.DISPATCHING);
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
    transitionStatus(state, STATUS.AWAITING_DEV_REVIEW);
    transitionStatus(state, STATUS.QA_PENDING);
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
  it("transitions VALIDATING → AWAITING_STOP_REVIEW and arms the gate", () => {
    const file = makeStateFile({ status: STATUS.VALIDATING });
    const r = runCli("arm-for-dispatch", file);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /awaiting_stop_review/);
    assert.match(r.stderr, /validating → awaiting_stop_review/);
    const after = loadState(file);
    assert.equal(after.status, STATUS.AWAITING_STOP_REVIEW);
    assert.equal(after.stop_review.armed, true);
  });

  it("re-arms from STOP_REVIEW_BLOCKED (post-BLOCK redispatch path)", () => {
    const file = makeStateFile({ status: STATUS.STOP_REVIEW_BLOCKED });
    const r = runCli("arm-for-dispatch", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.status, STATUS.AWAITING_STOP_REVIEW);
    assert.equal(after.stop_review.armed, true);
  });

  it("rejects invocation from a non-dispatch status (e.g. approved)", () => {
    const file = makeStateFile({ status: STATUS.APPROVED });
    const r = runCli("arm-for-dispatch", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /assertExpectedStatus|status.*approved/i);
    // State unchanged.
    assert.equal(loadState(file).status, STATUS.APPROVED);
  });
});

// ---------------------------------------------------------------------------
// rework lifecycle
// ---------------------------------------------------------------------------

describe("runner-state-cli begin-rework + rework-done", () => {
  it("begin-rework bumps round, records feedback path, transitions", () => {
    const file = makeStateFile({ status: STATUS.AWAITING_DEV_REVIEW });
    const feedback = path.join(path.dirname(file), "feedback-round-2.json");
    const r = runCli("begin-rework", file, feedback);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.status, STATUS.REWORK_IN_PROGRESS);
    assert.equal(after.dev_review.current_round, 1);
    assert.match(after.dev_review.last_feedback_path, /feedback-round-2\.json$/);
  });

  it("begin-rework requires a feedback path", () => {
    const file = makeStateFile({ status: STATUS.AWAITING_DEV_REVIEW });
    const r = runCli("begin-rework", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /feedback-path/);
  });

  it("rework-done returns to AWAITING_DEV_REVIEW", () => {
    const file = makeStateFile({ status: STATUS.REWORK_IN_PROGRESS });
    const r = runCli("rework-done", file);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(loadState(file).status, STATUS.AWAITING_DEV_REVIEW);
  });

  it("rework-done rejects from AWAITING_DEV_REVIEW (no rework in flight)", () => {
    const file = makeStateFile({ status: STATUS.AWAITING_DEV_REVIEW });
    const r = runCli("rework-done", file);
    assert.equal(r.status, 1);
    assert.equal(loadState(file).status, STATUS.AWAITING_DEV_REVIEW);
  });
});

// ---------------------------------------------------------------------------
// QA loop
// ---------------------------------------------------------------------------

describe("runner-state-cli mark-qa-pending + qa-resolved", () => {
  it("mark-qa-pending → qa_pending", () => {
    const file = makeStateFile({ status: STATUS.AWAITING_DEV_REVIEW });
    const r = runCli("mark-qa-pending", file);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(loadState(file).status, STATUS.QA_PENDING);
  });

  it("qa-resolved → awaiting_dev_review", () => {
    const file = makeStateFile({ status: STATUS.QA_PENDING });
    const r = runCli("qa-resolved", file);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(loadState(file).status, STATUS.AWAITING_DEV_REVIEW);
  });

  it("qa-resolved rejects when status is not qa_pending", () => {
    const file = makeStateFile({ status: STATUS.AWAITING_DEV_REVIEW });
    const r = runCli("qa-resolved", file);
    assert.equal(r.status, 1);
  });
});

// ---------------------------------------------------------------------------
// approval + merge
// ---------------------------------------------------------------------------

describe("runner-state-cli mark-approved + mark-merged", () => {
  it("mark-approved transitions awaiting_dev_review → approved", () => {
    const file = makeStateFile({ status: STATUS.AWAITING_DEV_REVIEW });
    const r = runCli("mark-approved", file);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(loadState(file).status, STATUS.APPROVED);
  });

  it("mark-merged transitions approved → merged", () => {
    const file = makeStateFile({ status: STATUS.APPROVED });
    const r = runCli("mark-merged", file);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(loadState(file).status, STATUS.MERGED);
  });

  it("mark-merged rejects from a non-approved status", () => {
    const file = makeStateFile({ status: STATUS.AWAITING_DEV_REVIEW });
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
    const file = makeStateFile({ status: STATUS.APPROVED });
    const r = runCli("reset", file, "--confirm");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /merged/);
    // State untouched.
    assert.equal(fs.existsSync(file), true);
    assert.equal(loadState(file).status, STATUS.APPROVED);
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
    const file = makeStateFile({ status: STATUS.VALIDATING });
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
