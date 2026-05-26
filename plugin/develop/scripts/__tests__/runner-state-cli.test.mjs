import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  DEV_REVIEW_PHASE,
  loadState,
  saveState,
  setDevReviewPhase,
} from "../lib/runner-state.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(SCRIPT_DIR, "..", "runner-state-cli.mjs");

let tmpDir;
let counter = 0;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-state-cli-test-"));
});

after(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

function makeStateFile({ phase = null } = {}) {
  counter += 1;
  const dir = path.join(tmpDir, `plan-${counter}`);
  fs.mkdirSync(dir, { recursive: true });
  const statePath = path.join(dir, ".runner-state.json");
  const state = {
    plan_slug: `plan-${counter}`,
    plan_path: `/repo/plans/plan-${counter}.plan.md`,
    owner_agent: "general-developer",
    base_branch: "main",
    task_branch: `feat/plan-${counter}`,
    worktree_path: `/repo/worktrees/feat-plan-${counter}`,
    dev_review: { phase: null, last_feedback_path: null },
  };
  if (phase) setDevReviewPhase(state, phase);
  saveState(statePath, state);
  return statePath;
}

function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

// ---------------------------------------------------------------------------
// rework lifecycle
// ---------------------------------------------------------------------------

describe("runner-state-cli begin-rework + rework-done", () => {
  it("begin-rework records feedback path and sets phase=rework", () => {
    const file = makeStateFile();
    const feedback = path.join(path.dirname(file), "feedback.json");
    const r = runCli("begin-rework", file, feedback);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /rework/);
    const after = loadState(file);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.REWORK);
    assert.match(after.dev_review.last_feedback_path, /feedback\.json$/);
  });

  it("begin-rework requires a feedback path", () => {
    const file = makeStateFile();
    const r = runCli("begin-rework", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /feedback-path/);
  });

  it("rework-done returns phase to AWAITING", () => {
    const file = makeStateFile({ phase: DEV_REVIEW_PHASE.REWORK });
    const r = runCli("rework-done", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
  });
});

// ---------------------------------------------------------------------------
// QA loop
// ---------------------------------------------------------------------------

describe("runner-state-cli mark-qa-pending + qa-resolved", () => {
  it("mark-qa-pending → phase=qa", () => {
    const file = makeStateFile();
    const r = runCli("mark-qa-pending", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.QA);
  });

  it("qa-resolved → phase=awaiting", () => {
    const file = makeStateFile({ phase: DEV_REVIEW_PHASE.QA });
    const r = runCli("qa-resolved", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("runner-state-cli reset", () => {
  it("dry-run lists targets without deleting", () => {
    const file = makeStateFile();
    const dir = path.dirname(file);
    fs.writeFileSync(path.join(dir, "feedback.json"), "{}");
    fs.writeFileSync(path.join(dir, "feedback-round-2.json"), "{}");
    const r = runCli("reset", file);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /dry-run/);
    assert.equal(fs.existsSync(file), true);
    assert.equal(fs.existsSync(path.join(dir, "feedback.json")), true);
    assert.equal(fs.existsSync(path.join(dir, "feedback-round-2.json")), true);
  });

  it("--confirm removes state file and feedback siblings", () => {
    const file = makeStateFile();
    const dir = path.dirname(file);
    fs.writeFileSync(path.join(dir, "feedback.json"), "{}");
    fs.writeFileSync(path.join(dir, "feedback-round-3.json"), "{}");
    fs.writeFileSync(path.join(dir, "notes.md"), "keep me");
    const r = runCli("reset", file, "--confirm");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.existsSync(file), false);
    assert.equal(fs.existsSync(path.join(dir, "feedback.json")), false);
    assert.equal(fs.existsSync(path.join(dir, "feedback-round-3.json")), false);
    assert.equal(fs.existsSync(path.join(dir, "notes.md")), true);
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

  it("prints usage with --help", () => {
    const r = runCli("--help");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage:/);
  });

  it("rejects unknown subcommands", () => {
    const file = makeStateFile();
    const r = runCli("teleport", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown subcommand/);
  });

  it("rejects missing state path", () => {
    const r = runCli("begin-rework");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /<state-path>/);
  });

  it("rejects a state path that does not exist", () => {
    const r = runCli("rework-done", path.join(tmpDir, "no-such-file.json"));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not found/);
  });

  it("removed subcommands surface as unknown", () => {
    const file = makeStateFile();
    for (const sub of ["arm-for-dispatch", "mark-approved", "mark-merged",
                       "record-stop-review-allow", "record-stop-review-downgrade",
                       "record-stop-review-block"]) {
      const r = runCli(sub, file);
      assert.equal(r.status, 1, `expected ${sub} to be rejected`);
      assert.match(r.stderr, /unknown subcommand/, `expected ${sub} to be unknown`);
    }
  });
});
