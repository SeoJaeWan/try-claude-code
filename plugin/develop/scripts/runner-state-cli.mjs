#!/usr/bin/env node

// runner-state-cli — runner 스킬용 dev-review 단계 변경 CLI.
//
// runner 스킬(plugin/develop/skills/runner/SKILL.md)은 Claude가 매 턴 읽는
// 프로즈다. dev-review 하위 상태 전이(awaiting ↔ rework ↔ qa)는 한 plan
// 실행 안에서 여러 번 발생하므로, plan-state.json을 한 줄 명령으로 갱신할
// 수 있게 단일 원자 커맨드로 제공한다. (load/mutate/save를 인라인으로
// 풀어쓰지 않기 위함.)
//
// status 수준의 전이는 모두 제거되었다. 슬림 plan-state JSON은 더 이상
// `status` 필드를 가지지 않으며, 현재 Step은 디스크 관찰(워크트리 존재,
// 커밋 수, feedback.json)을 통해 runner 스킬이 직접 추론한다. 본 CLI는
// `dev_review.phase` 값과 머지 후 정리만 책임진다.
//
// 서브커맨드:
//
//   begin-rework <state-path> <feedback-path>
//     dev_review.phase 를 "rework" 로 설정하고 feedback 파일 경로를
//     기록한다. runner 스킬이 rework 에이전트를 디스패치할 때 rework_items[]
//     를 찾기 위해 이 경로를 참조한다.
//
//   rework-done <state-path>
//     dev_review.phase 를 "awaiting" 으로 되돌린다.
//
//   mark-qa-pending <state-path>
//     dev_review.phase 를 "qa" 로 설정한다.
//
//   qa-resolved <state-path>
//     dev_review.phase 를 "awaiting" 으로 되돌린다.
//
//   reset <state-path> [--confirm]
//     state 파일과 plans/{plan_key}/ 아래의 형제 feedback*.json 을 모두
//     삭제한다. --confirm 없이 호출하면 삭제 대상 목록만 stderr로 출력하고
//     종료한다(dry-run). 머지 후 정리 용도이며, runner 스킬은
//     `touch plans/{plan_key}/.merged` 다음에 이 명령을 호출한다.
//
// 종료 코드:
//   0   변경 성공(또는 dry-run 출력 완료)
//   1   인자 누락, 파일 누락, 알 수 없는 서브커맨드

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  DEV_REVIEW_PHASE,
  loadState,
  saveState,
  setDevReviewFeedbackPath,
  setDevReviewPhase,
} from "./lib/runner-state.mjs";

const USAGE = `Usage:
  runner-state-cli begin-rework <state-path> <feedback-path>
  runner-state-cli rework-done <state-path>
  runner-state-cli mark-qa-pending <state-path>
  runner-state-cli qa-resolved <state-path>
  runner-state-cli reset <state-path> [--confirm]`;

/**
 * 사람용 에러 메시지를 stderr에 출력하고 종료 코드 1로 프로세스를 종료한다.
 *
 * @param {string} message - stderr에 출력할 에러 메시지.
 * @returns {never}
 */
function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * state 파일을 로드하고, 존재하지 않거나 파싱 실패 시 fail로 즉시 종료한다.
 *
 * @param {string} statePath - state 파일 절대 경로.
 * @returns {object} 파싱된 plan-state 객체.
 */
function loadOrFail(statePath) {
  if (!fs.existsSync(statePath)) {
    fail(`runner-state-cli: state file not found at ${statePath}`);
  }
  try {
    return loadState(statePath);
  } catch (err) {
    fail(`runner-state-cli: failed to load state: ${err.message}`);
  }
}

// 4개의 phase 변경 서브커맨드는 모두 동일한 형태를 따른다:
// state 로드 → phase 변경 → (필요 시) feedback 경로 기록 → 저장.
// 디스패치 함수를 단순하게 유지하기 위해 한 테이블에 모아두었다.
const PHASE_MUTATIONS = {
  "begin-rework":    { to: DEV_REVIEW_PHASE.REWORK,   needsFeedback: true },
  "rework-done":     { to: DEV_REVIEW_PHASE.AWAITING },
  "mark-qa-pending": { to: DEV_REVIEW_PHASE.QA },
  "qa-resolved":     { to: DEV_REVIEW_PHASE.AWAITING },
};

/**
 * phase 변경 계열 서브커맨드(begin-rework / rework-done / mark-qa-pending /
 * qa-resolved)를 공통 로직으로 처리한다.
 *
 * @param {string} subcommand - PHASE_MUTATIONS의 키.
 * @param {string} statePath - state 파일 절대 경로.
 * @param {string[]} args - 추가 인자(begin-rework는 feedback-path 필수).
 */
function cmdPhaseMutation(subcommand, statePath, args) {
  const spec = PHASE_MUTATIONS[subcommand];
  let feedbackPath = null;
  if (spec.needsFeedback) {
    if (!args[0]) fail(`runner-state-cli: ${subcommand} requires <feedback-path>`);
    feedbackPath = path.isAbsolute(args[0]) ? args[0] : path.resolve(process.cwd(), args[0]);
  }
  const state = loadOrFail(statePath);
  const before = state.dev_review?.phase ?? null;
  if (spec.needsFeedback) setDevReviewFeedbackPath(state, feedbackPath);
  try {
    setDevReviewPhase(state, spec.to);
  } catch (err) {
    fail(`runner-state-cli: ${err.message}`);
  }
  saveState(statePath, state);
  process.stderr.write(`[${subcommand}] phase ${before ?? "null"} → ${spec.to}\n`);
  process.stdout.write(`${spec.to}\n`);
}

/**
 * 머지 후 정리용 reset 서브커맨드. dev_review.phase 는 건드리지 않고,
 * state 파일과 형제 feedback*.json 을 모두 삭제한다.
 * --confirm 없이 호출하면 삭제 대상만 출력하는 dry-run 모드로 동작한다.
 *
 * @param {string} statePath - state 파일 절대 경로.
 * @param {string[]} args - 추가 인자(`--confirm` 포함 여부 확인).
 */
function cmdReset(statePath, args) {
  if (!fs.existsSync(statePath)) {
    fail(`runner-state-cli: state file not found at ${statePath}`);
  }
  const dir = path.dirname(statePath);
  const targets = [statePath];
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith("feedback") && entry.endsWith(".json")) {
      targets.push(path.join(dir, entry));
    }
  }
  const confirm = args.includes("--confirm");
  if (!confirm) {
    process.stderr.write("[reset] dry-run — pass --confirm to delete:\n");
    for (const t of targets) process.stderr.write(`  ${t}\n`);
    return;
  }
  for (const t of targets) {
    try {
      fs.unlinkSync(t);
      process.stderr.write(`[reset] removed ${t}\n`);
    } catch (err) {
      process.stderr.write(`[reset] failed to remove ${t}: ${err.message}\n`);
    }
  }
  process.stdout.write(`reset\n`);
}

/**
 * CLI 진입점. argv를 파싱해 서브커맨드별 핸들러로 라우팅한다.
 */
function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const [subcommand, statePath, ...rest] = argv;
  if (!statePath) {
    fail(`runner-state-cli: <state-path> is required\n${USAGE}`);
  }

  switch (subcommand) {
    case "begin-rework":
    case "rework-done":
    case "mark-qa-pending":
    case "qa-resolved":
      return cmdPhaseMutation(subcommand, statePath, rest);
    case "reset":
      return cmdReset(statePath, rest);
    default:
      fail(`runner-state-cli: unknown subcommand "${subcommand}"\n${USAGE}`);
  }
}

main();
