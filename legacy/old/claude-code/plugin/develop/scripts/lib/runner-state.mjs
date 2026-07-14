// runner 스킬의 plan-state 컨테이너.
//
// runner가 실행하는 모든 plan은 `plans/{plan_key}/.runner-state.json` 위치에
// 자신의 JSON 파일을 하나씩 소유한다. 해당 경로는 runner 스킬이 Step 1에서
// 직접 도출해 최초 레코드를 기록하며, 본 모듈은 runner-state-cli.mjs 와
// dev-review/scripts/generate-review-data.mjs 가 공유하는 영속화 +
// `dev_review.phase` 변경 표면만 제공한다.
//
// 상태 스키마:
//
//   {
//     plan_slug, plan_path, owner_agent,
//     task_branch, worktree_path, base_branch,
//     dev_review: { phase, last_feedback_path }
//   }
//
// `dev_review.phase` 는 `"awaiting" | "rework" | "qa" | null` 중 하나다.
// dev-review 스킬이 runner 스킬에서 받은 state_path 로 이 파일을 읽으므로,
// 필드 형태는 dev-review 와의 계약의 일부다. 두 스킬을 함께 조정하지 않고는
// 필드 이름을 바꾸거나 이동시키지 말 것.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Windows 백슬래시 경로를 POSIX 슬래시 경로로 변환한다.
 * JSON에 저장할 때 OS 차이를 제거하기 위함이다.
 *
 * @param {string} p - 변환할 경로.
 * @returns {string} POSIX 형식 경로. falsy 입력은 빈 문자열로 반환한다.
 */
function toPosixPath(p) {
  if (!p) return "";
  return String(p).replace(/\\/g, "/");
}

// dev_review.phase 값. 슬림 스키마에 남은 유일한 하위 상태다.
export const DEV_REVIEW_PHASE = Object.freeze({
  AWAITING: "awaiting",
  REWORK: "rework",
  QA: "qa",
});
const DEV_REVIEW_PHASE_VALUES = new Set(Object.values(DEV_REVIEW_PHASE));

// ---------------------------------------------------------------------------
// 영속화
// ---------------------------------------------------------------------------

/**
 * state 파일을 읽어 plan-state 객체로 파싱한다.
 * 단계별로 명확한 에러 메시지를 던지므로 호출자는 어떤 단계에서 실패했는지
 * 구분할 수 있다.
 *
 * @param {string} statePath - state 파일 절대 경로.
 * @returns {object} 파싱된 plan-state 객체.
 * @throws {Error} 파일 읽기·JSON 파싱·타입 검증 중 하나라도 실패할 때.
 */
export function loadState(statePath) {
  let raw;
  try {
    raw = fs.readFileSync(statePath, "utf8");
  } catch (err) {
    throw new Error(
      `plan-state: failed to read ${statePath}: ${err.message}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(
      `plan-state: failed to parse JSON at ${statePath}: ${parseErr.message}`,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`plan-state: ${statePath} did not parse to an object`);
  }
  return parsed;
}

/**
 * plan-state를 같은 디렉터리의 임시 파일에 쓴 뒤 renameSync로 원자 교체한다.
 * rename 은 source 와 target 이 같은 볼륨에 있을 때 POSIX/Windows 양쪽에서
 * 원자적이며, 임시 파일은 항상 타깃 디렉터리에 만든다.
 *
 * @param {string} statePath - 기록할 state 파일 절대 경로.
 * @param {object} state - 직렬화할 plan-state 객체.
 */
export function saveState(statePath, state) {
  const dir = path.dirname(statePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmp = path.join(
    dir,
    `.runner-state.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`,
  );
  const body = `${JSON.stringify(state, null, 2)}\n`;
  fs.writeFileSync(tmp, body, "utf8");
  try {
    fs.renameSync(tmp, statePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* best-effort 정리 */ }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// dev_review.phase 변경자
// ---------------------------------------------------------------------------

/**
 * dev_review.phase 를 변경한다. 값이 enum에 속하지 않으면 예외를 던진다.
 * 호출자가 saveState 를 별도로 호출해야 디스크에 반영된다.
 *
 * @param {object} state - 변경 대상 plan-state 객체(in-place 수정).
 * @param {("awaiting"|"rework"|"qa"|null)} nextPhase - 새 phase 값.
 * @throws {Error} 알 수 없는 phase 값이 주어질 때.
 */
export function setDevReviewPhase(state, nextPhase) {
  if (nextPhase !== null && !DEV_REVIEW_PHASE_VALUES.has(nextPhase)) {
    throw new Error(`setDevReviewPhase: unknown phase "${nextPhase}"`);
  }
  state.dev_review.phase = nextPhase;
}

/**
 * dev_review.last_feedback_path 에 feedback 파일 경로를 기록한다.
 * 경로는 POSIX 형식으로 정규화해서 저장하며, falsy 값이면 null 로 설정한다.
 * 호출자가 saveState 를 별도로 호출해야 디스크에 반영된다.
 *
 * @param {object} state - 변경 대상 plan-state 객체(in-place 수정).
 * @param {string|null} feedbackPath - 기록할 feedback 파일 경로. null 가능.
 */
export function setDevReviewFeedbackPath(state, feedbackPath) {
  state.dev_review.last_feedback_path = feedbackPath
    ? toPosixPath(feedbackPath)
    : null;
}
