// Extracted from stop-review-gate-hook.mjs so the verdict-application logic
// can be unit-tested without spinning up Codex.
//
// `applyVerdictToPlanState` is the single function that translates a
// stop-review outcome (ALLOW / ALLOW_DOWNGRADED / SKIPPED / BLOCK / TIMEOUT)
// into plan-state mutations: arming/disarming the gate, recording the last
// reviewed commit, advancing status, and tracking the BLOCK and downgrade
// streaks. The hook then concatenates the strings this function returns
// (`plannerDirective`, `escalationNote`, `downgradeWarning`) onto its
// outgoing decision payload.

import process from "node:process";

import {
  DEV_REVIEW_PHASE,
  STATUS,
  STOP_REVIEW_PHASE,
  bumpConsecutiveDowngrades,
  clearConsecutiveDowngrades,
  clearPlanBlockStreak,
  recordPlanBlock,
  saveState,
  setDevReviewPhase,
  setLastReviewedCommit,
  setStopReviewArmed,
  setStopReviewPhase,
  transitionStatus,
} from "./runner-state.mjs";
import { STOP_REVIEW_OUTCOME } from "./stop-review-outcome.mjs";

export const SAME_BLOCK_ESCALATION_THRESHOLD = 3;
// Same threshold pattern as BLOCK escalation: surface a warning once a plan
// has ridden through three consecutive low-confidence downgrades. The intent
// is to catch Codex prompt drift, not to gate the verdict — the plan still
// advances, the user just sees a paragraph nudging them to inspect the
// suppressed findings under .codex/reviews/.
export const CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD = 3;

// Build the "[plan-runner: replay <state-path>]" directive that the runner
// skill consumes on the next turn. The skill reads the state file at that
// path and re-dispatches the plan agent against the current BLOCK reason.
export function buildPlannerBlockDirective(reviewItem) {
  const planTag = `replay ${reviewItem.statePath}`;
  return [
    "",
    "---",
    `[plan-runner: ${planTag}] 아래 순서로 검증 후 행동:`,
    "1. 현재 plan 범위 밖 이슈 또는 테스트파일 관련 이슈 → 폐기",
    "2. 남은 이슈가 실제로 코드에 존재하는지 직접 확인 → 사실과 다르면 폐기",
    `3. 유효 이슈가 남으면 → 위 state 파일을 읽어 owner_agent와 worktree_path를 확인하고 같은 plan 에이전트를 재디스패치, 커밋 후 턴 종료`,
    "4. 모두 폐기되면 → 재디스패치 없이 그냥 턴 종료 (다음 stop-gate에서 ALLOW)",
  ].join("\n");
}

// Build a one-line stderr trail describing the state mutation about to land.
// Stop hook stderr surfaces as a Claude Code systemMessage so the user
// sees every transition without having to open the JSON file. Kept here
// (rather than at each setter) so the line emits exactly once per verdict
// even though several fields change atomically.
function logStateMutation(label, before, after, statePath) {
  const fmt = (s) => (s == null ? "null" : s);
  const lines = [
    `[stop-gate] state mutation [${label}] — ${statePath}`,
    `  status:           ${fmt(before.status)} → ${fmt(after.status)}`,
    `  stop_review.phase:${fmt(before.stopPhase)} → ${fmt(after.stopPhase)}`,
    `  stop_review.armed:${fmt(before.armed)} → ${fmt(after.armed)}`,
    `  dev_review.phase: ${fmt(before.devPhase)} → ${fmt(after.devPhase)}`,
  ];
  process.stderr.write(`${lines.join("\n")}\n`);
}

function snapshot(state) {
  return {
    status: state.status,
    stopPhase: state.stop_review?.phase ?? null,
    armed: state.stop_review?.armed ?? false,
    devPhase: state.dev_review?.phase ?? null,
  };
}

// Apply the verdict to the plan-state and return any extra text (escalation
// notes, planner directive, downgrade warning) that needs to ride along with
// the BLOCK reason or the ALLOW systemMessage.
export function applyVerdictToPlanState(reviewItem, outcome, review) {
  const { state, statePath } = reviewItem;
  const before = snapshot(state);
  let plannerDirective = "";
  let escalationNote = "";
  let downgradeWarning = "";

  // TIMEOUT is a non-event from the plan's perspective: Codex didn't return
  // a verdict, so we must not advance status, mark a commit as reviewed, or
  // record a block. Leaving the gate armed and last_reviewed_commit unchanged
  // means the next Stop hook firing reviews the same diff again — exactly
  // the retry the user is told to expect in the systemMessage. No saveState
  // here because we did not mutate.
  if (outcome === STOP_REVIEW_OUTCOME.TIMEOUT) {
    process.stderr.write(
      `[stop-gate] TIMEOUT — no state mutation; gate stays armed (${statePath})\n`,
    );
    return { plannerDirective, escalationNote, downgradeWarning };
  }

  if (
    outcome === STOP_REVIEW_OUTCOME.ALLOW ||
    outcome === STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED ||
    outcome === STOP_REVIEW_OUTCOME.SKIPPED
  ) {
    setStopReviewArmed(state, false);
    // last_result is a user-visible log label, not the outcome enum — keep
    // the historical "ALLOW" / "skipped" casing the plan-state JSON has
    // always recorded.
    setLastReviewedCommit(
      state,
      reviewItem.headSha,
      outcome === STOP_REVIEW_OUTCOME.SKIPPED ? "skipped" : "ALLOW",
    );
    clearPlanBlockStreak(state);
    // Track consecutive low-confidence downgrades. A clean ALLOW or skip
    // resets the streak; only the downgrade path bumps. We compute the
    // warning message here (rather than in the caller) so the caller can
    // simply concatenate it to the systemMessage.
    if (outcome === STOP_REVIEW_OUTCOME.ALLOW_DOWNGRADED) {
      const count = bumpConsecutiveDowngrades(state);
      if (count >= CONSECUTIVE_DOWNGRADE_WARNING_THRESHOLD) {
        downgradeWarning = [
          "",
          "---",
          `[stop-gate] 주의 — 이 plan에서 연속 ${count}회 BLOCK이 저신뢰`,
          "다운그레이드되었습니다. .codex/reviews/ 의 details를 확인하세요.",
          "Codex prompt template 변경이 의심되면 confidence threshold(7)를",
          "검토하세요.",
        ].join("\n");
      }
    } else {
      clearConsecutiveDowngrades(state);
    }
    // Move forward only when we are still inside Step 3 (DISPATCHING with
    // an armed/blocked phase). Other statuses keep their position so we do
    // not accidentally rewind a plan that already advanced (e.g. mid-rework
    // commits flow through the DEV_REVIEWING+REWORK phase, not stop-review).
    if (state.status === STATUS.DISPATCHING) {
      // Mark the gate as having passed for callers reading between the
      // verdict and the transition; then leave Step 3 for Step 4 with a
      // fresh AWAITING phase.
      setStopReviewPhase(state, STOP_REVIEW_PHASE.PASSED);
      transitionStatus(state, STATUS.DEV_REVIEWING);
      setStopReviewPhase(state, null);
      setDevReviewPhase(state, DEV_REVIEW_PHASE.AWAITING);
    }
  } else if (outcome === STOP_REVIEW_OUTCOME.BLOCK) {
    // BLOCK leaves the gate armed so the next plan-agent dispatch's commits
    // get reviewed again. The runner skill is responsible for that dispatch
    // — we just record the block_history entry and emit the directive.
    // A real BLOCK (no downgrade) also resets the consecutive-downgrade
    // streak: the prompt is producing high-confidence findings again.
    clearConsecutiveDowngrades(state);
    setLastReviewedCommit(state, reviewItem.headSha, "BLOCK");
    const { count } = recordPlanBlock(state, review.reason);
    // BLOCK is a phase change inside DISPATCHING; the status itself does not
    // move. The PreToolUse auto-arm flips phase back to ARMED on the next
    // plan-agent re-dispatch.
    if (
      state.status === STATUS.DISPATCHING &&
      state.stop_review.phase !== STOP_REVIEW_PHASE.BLOCKED
    ) {
      setStopReviewPhase(state, STOP_REVIEW_PHASE.BLOCKED);
    }
    plannerDirective = buildPlannerBlockDirective(reviewItem);
    if (count >= SAME_BLOCK_ESCALATION_THRESHOLD) {
      escalationNote = [
        "",
        "---",
        `[escalation] 같은 이슈로 ${count}회 연속 BLOCK되었습니다. 자동 재디스패치만으로는 해결되지 않을 가능성이 큽니다.`,
        "다음 중 하나를 선택하세요:",
        "  1) 사용자(사람)가 직접 원인을 진단 — 코드/테스트/plan을 재검토",
        "  2) 해당 phase의 기대 동작(plan 또는 phase 파일)을 수정",
        "  3) 현재 worktree를 폐기하고 처음부터 다시 시작",
      ].join("\n");
    }
  }

  saveState(statePath, state);
  logStateMutation(outcome, before, snapshot(state), statePath);
  return { plannerDirective, escalationNote, downgradeWarning };
}
