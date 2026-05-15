import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  DEV_REVIEW_PHASE,
  STATUS,
  STOP_REVIEW_PHASE,
  createInitialState,
  loadState,
  saveState,
  setStopReviewArmed,
  setStopReviewPhase,
  transitionStatus,
} from "../lib/runner-state.mjs";

// Integration tests for the record-stop-review-* CLI subcommands. They exist
// to lock the contract between the Stop hook (which spawns them) and the
// plan-state SSOT — the same contract that lib/stop-review-verdict.mjs used
// to test in-process before Phase 4 moved the mutation into the CLI.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, "..", "runner-state-cli.mjs");
const HEAD_SHA = "abcdef1234567890";

let tmpDir;
let counter = 0;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "record-stop-review-test-"));
});
after(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

function makeStateAtArmed(extraSetup) {
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
  setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
  setStopReviewArmed(state, true);
  if (extraSetup) extraSetup(state);
  saveState(statePath, state);
  return statePath;
}

function runCli(args) {
  const r = spawnSync("node", [CLI, ...args], { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe("record-stop-review-allow", () => {
  it("advances dispatching/armed → dev_reviewing/awaiting and disarms", () => {
    const statePath = makeStateAtArmed();
    const r = runCli(["record-stop-review-allow", statePath, HEAD_SHA]);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.DEV_REVIEWING);
    assert.equal(after.stop_review.phase, null);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
    assert.equal(after.stop_review.armed, false);
    assert.equal(after.stop_review.last_reviewed_commit, HEAD_SHA);
    assert.equal(after.stop_review.last_result, "ALLOW");
  });

  it("rejects missing head-sha", () => {
    const statePath = makeStateAtArmed();
    const r = runCli(["record-stop-review-allow", statePath]);
    assert.notEqual(r.status, 0);
  });
});

describe("record-stop-review-downgrade", () => {
  it("advances dispatching/armed → dev_reviewing/awaiting (same as allow)", () => {
    const statePath = makeStateAtArmed();
    const r = runCli(["record-stop-review-downgrade", statePath, HEAD_SHA]);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.DEV_REVIEWING);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
    assert.equal(after.stop_review.last_result, "ALLOW");
  });
});

describe("record-stop-review-block", () => {
  function writeReason(text) {
    const f = path.join(tmpDir, `reason-${++counter}.txt`);
    fs.writeFileSync(f, text, "utf8");
    return f;
  }

  it("sets phase=BLOCKED, keeps armed=true, prints planner directive", () => {
    const statePath = makeStateAtArmed();
    const reasonFile = writeReason("BLOCK: real high-confidence finding\n[conf 9] x");
    const r = runCli(["record-stop-review-block", statePath, HEAD_SHA, reasonFile]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /\[plan-runner: replay /);
    const after = loadState(statePath);
    assert.equal(after.status, STATUS.DISPATCHING);
    assert.equal(after.stop_review.phase, STOP_REVIEW_PHASE.BLOCKED);
    assert.equal(after.stop_review.last_result, "BLOCK");
    assert.equal(after.stop_review.last_reviewed_commit, HEAD_SHA);
  });

  it("appends a new block_history entry on each BLOCK (no coalescing)", () => {
    const statePath = makeStateAtArmed();
    const reasonFile = writeReason("BLOCK: same finding text repeated\n[conf 8] x");
    for (let i = 0; i < 3; i += 1) {
      const state = loadState(statePath);
      if (state.stop_review.phase === STOP_REVIEW_PHASE.BLOCKED) {
        setStopReviewPhase(state, STOP_REVIEW_PHASE.ARMED);
        setStopReviewArmed(state, true);
        saveState(statePath, state);
      }
      const r = runCli(["record-stop-review-block", statePath, HEAD_SHA, reasonFile]);
      assert.equal(r.status, 0, r.stderr);
      assert.doesNotMatch(r.stdout, /escalation|연속/);
    }
    const after = loadState(statePath);
    assert.equal(after.stop_review.block_history.length, 3);
  });

  it("rejects a missing reason file", () => {
    const statePath = makeStateAtArmed();
    const r = runCli([
      "record-stop-review-block",
      statePath,
      HEAD_SHA,
      path.join(tmpDir, "does-not-exist.txt"),
    ]);
    assert.notEqual(r.status, 0);
  });
});
