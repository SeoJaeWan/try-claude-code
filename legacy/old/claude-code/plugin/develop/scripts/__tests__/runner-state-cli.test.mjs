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

/**
 * 임시 디렉터리 하위에 새 state 파일을 만들어 경로를 반환한다.
 * counter 를 사용해 호출마다 별도의 plan 디렉터리를 사용하므로
 * 테스트 간 간섭이 없다.
 *
 * @param {{phase?: string|null}} [opts] - 초기 phase 값.
 * @returns {string} 생성된 state 파일 절대 경로.
 */
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

/**
 * CLI 를 자식 프로세스로 실행하고 spawnSync 결과를 반환한다.
 *
 * @param {...string} args - CLI 에 전달할 인자.
 * @returns {import("node:child_process").SpawnSyncReturns<string>}
 */
function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

// ---------------------------------------------------------------------------
// rework 라이프사이클
// ---------------------------------------------------------------------------

describe("runner-state-cli begin-rework + rework-done", () => {
  it("begin-rework는 feedback 경로를 기록하고 phase=rework로 설정한다", () => {
    const file = makeStateFile();
    const feedback = path.join(path.dirname(file), "feedback.json");
    const r = runCli("begin-rework", file, feedback);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /rework/);
    const after = loadState(file);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.REWORK);
    assert.match(after.dev_review.last_feedback_path, /feedback\.json$/);
  });

  it("begin-rework는 feedback 경로 인자가 없으면 실패한다", () => {
    const file = makeStateFile();
    const r = runCli("begin-rework", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /feedback-path/);
  });

  it("rework-done은 phase를 AWAITING으로 되돌린다", () => {
    const file = makeStateFile({ phase: DEV_REVIEW_PHASE.REWORK });
    const r = runCli("rework-done", file);
    assert.equal(r.status, 0, r.stderr);
    const after = loadState(file);
    assert.equal(after.dev_review.phase, DEV_REVIEW_PHASE.AWAITING);
  });
});

// ---------------------------------------------------------------------------
// QA 루프
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
  it("dry-run은 삭제 대상만 나열하고 실제로 삭제하지 않는다", () => {
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

  it("--confirm은 state 파일과 형제 feedback 파일을 삭제한다", () => {
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
// 인자 처리
// ---------------------------------------------------------------------------

describe("runner-state-cli 인자 처리", () => {
  it("인자 없이 호출하면 사용법을 출력한다", () => {
    const r = runCli();
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage:/);
  });

  it("--help 옵션은 사용법을 출력한다", () => {
    const r = runCli("--help");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage:/);
  });

  it("알 수 없는 서브커맨드를 거부한다", () => {
    const file = makeStateFile();
    const r = runCli("teleport", file);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown subcommand/);
  });

  it("state 경로 인자 누락을 거부한다", () => {
    const r = runCli("begin-rework");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /<state-path>/);
  });

  it("존재하지 않는 state 파일 경로를 거부한다", () => {
    const r = runCli("rework-done", path.join(tmpDir, "no-such-file.json"));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not found/);
  });

  it("제거된 서브커맨드는 알 수 없는 서브커맨드로 처리된다", () => {
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
