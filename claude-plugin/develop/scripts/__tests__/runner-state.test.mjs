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

/**
 * 슬림 plan-state 스키마에 맞춘 평면 객체 픽스처. runner 스킬은 Step 1에서
 * 같은 형태를 인라인으로 구성하므로(라이브러리 헬퍼 없음), 테스트도 같은
 * 방식으로 만든다.
 *
 * @param {string} [slug="x"] - 픽스처에 사용할 plan_slug.
 * @returns {object} plan-state 객체.
 */
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
// 영속화 (원자적 쓰기 라운드트립)
// ---------------------------------------------------------------------------

describe("saveState / loadState", () => {
  let tmpDir;
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-state-test-"));
  });
  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it("디스크 라운드트립이 정상 동작한다", () => {
    const state = makeState("rt");
    const file = path.join(tmpDir, "rt", ".runner-state.json");
    saveState(file, state);
    assert.equal(fs.existsSync(file), true);

    const loaded = loadState(file);
    assert.equal(loaded.plan_slug, "rt");
    assert.equal(loaded.task_branch, "feat/rt");
    assert.equal(loaded.dev_review.phase, null);
  });

  it("최초 저장 시 부모 디렉터리를 생성한다", () => {
    const state = makeState("deep");
    const file = path.join(tmpDir, "a", "b", "c", "deep", ".runner-state.json");
    saveState(file, state);
    assert.equal(fs.existsSync(file), true);
  });

  it("JSON이 손상된 경우 loadState가 예외를 던진다", () => {
    const state = makeState("corrupt");
    const file = path.join(tmpDir, "corrupt", ".runner-state.json");
    saveState(file, state);
    fs.writeFileSync(file, "{ corrupt", "utf8");
    assert.throws(() => loadState(file), /failed to parse JSON/);
  });

  it("레거시 스키마 파일을 로드해도 추가 필드는 무시한다", () => {
    // status/stop_review 등이 남아 있던 옛 state 파일도 그대로 파싱된다.
    // 슬림 runner-state.mjs 는 추가 필드를 단순히 무시한다.
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
// dev_review.phase 변경자
// ---------------------------------------------------------------------------

describe("setDevReviewPhase", () => {
  it("모든 phase 값을 차례로 적용한다", () => {
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

  it("알 수 없는 phase 값을 거부한다", () => {
    const s = makeState();
    assert.throws(() => setDevReviewPhase(s, "thinking"));
    assert.throws(() => setDevReviewPhase(s, "rework_pending"));
  });

  it("전이 방향을 제한하지 않는다 (Stop 훅 경쟁 상태가 사라졌으므로 전이표 없음)", () => {
    const s = makeState();
    setDevReviewPhase(s, DEV_REVIEW_PHASE.AWAITING);
    setDevReviewPhase(s, DEV_REVIEW_PHASE.REWORK);
    // REWORK → QA 직접 전이. 이전 v2 전이표에서는 금지였지만, 슬림 스키마는
    // 값만 검증할 뿐 엣지를 검증하지 않는다.
    setDevReviewPhase(s, DEV_REVIEW_PHASE.QA);
    assert.equal(s.dev_review.phase, DEV_REVIEW_PHASE.QA);
  });
});

describe("setDevReviewFeedbackPath", () => {
  it("state에 feedback 경로를 저장한다", () => {
    const s = makeState();
    setDevReviewFeedbackPath(s, "/p/x/dev-review/feedback.json");
    assert.equal(s.dev_review.last_feedback_path, "/p/x/dev-review/feedback.json");
    setDevReviewFeedbackPath(s, null);
    assert.equal(s.dev_review.last_feedback_path, null);
  });
});
