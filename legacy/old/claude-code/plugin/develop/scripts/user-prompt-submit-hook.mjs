#!/usr/bin/env node

// UserPromptSubmit 훅 — /runner 경로 안전성 검증 게이트.
//
// Claude Code가 사용자 프롬프트를 처리하기 전에 실행된다. 사용자가
// `/runner <plan-path>`를 입력하면 다음 세 가지 일만 수행한다:
//
//   1. 프롬프트에서 plan 파일 경로 인자를 파싱한다.
//   2. 경로가 실제 존재하는 파일이며 이름이 `*.plan.md` 또는 `plan.md`
//      형식인지 검증한다.
//   3. 절대 경로를 담은 `[runner-skill bootstrap]` 컨텍스트 라인을 emit
//      하여 runner 스킬이 이어서 처리할 수 있게 한다.
//
// 그 이상의 작업(frontmatter 파싱, state 경로 도출, state 파일 생성,
// `base_branch` 캡처, 슬러그 불일치 감지 등)은 runner 스킬 본문(Step 1)의
// 몫이다. 훅의 임무는 명백한 실수(인자 누락, 오타 경로, 잘못된 파일명)를
// 프롬프트가 Claude에 도달하기 전에 차단하는 것뿐이다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const RUNNER_TRIGGER_RE = /^\s*\/runner(?:\s|$)/;

/**
 * stdout으로 단일 JSON 객체를 직렬화해 출력한다.
 * Claude Code 훅 응답은 한 줄짜리 JSON으로 전달된다.
 *
 * @param {object} payload - 직렬화할 응답 객체.
 */
function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

/**
 * 성공 시 runner 스킬에 전달할 부트스트랩 컨텍스트를 emit한다.
 *
 * @param {string} planPathAbs - 검증된 plan 파일의 절대 경로(POSIX 형식).
 */
function emitContext(planPathAbs) {
  emit({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `[runner-skill bootstrap]\n  plan_path: ${planPathAbs}`,
    },
  });
}

/**
 * 검증 실패 시 프롬프트를 차단하는 응답을 emit한다.
 *
 * @param {string} reason - 사용자에게 표시할 한국어 차단 사유.
 */
function emitBlock(reason) {
  emit({
    decision: "block",
    reason: `[runner] /runner 진입을 차단했습니다.\n\n${reason}`,
  });
}

/**
 * 프로세스 stdin(파일 디스크립터 0) 전체를 동기적으로 읽는다.
 * Claude Code 훅은 stdin으로 JSON을 주입한다.
 *
 * @returns {string} 트리밍된 stdin 내용. 읽기 실패 시 빈 문자열.
 */
function readStdin() {
  try {
    return fs.readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

/**
 * stdin으로 받은 원본 문자열을 JSON 객체로 파싱한다.
 * 파싱 실패는 stderr 로그로만 남기고 빈 객체를 반환해 silent pass-through를
 * 유지한다(훅이 에러로 사용자 프롬프트를 막지 않는다).
 *
 * @param {string} raw - stdin에서 읽은 원본 문자열.
 * @returns {object} 파싱된 객체. 실패 시 `{}`.
 */
function parseInput(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    process.stderr.write(
      `[user-prompt-hook] failed to parse stdin: ${err.message}\n`,
    );
    return {};
  }
}

/**
 * `/runner <plan-path>` 또는 `/runner "<plan-path with spaces>"` 형태의
 * 프롬프트에서 plan 경로를 추출한다. 첫 번째 인자만 사용한다.
 *
 * @param {string} prompt - 사용자 입력 프롬프트.
 * @returns {string|null} 추출된 plan 경로. 인자가 없으면 null.
 */
function parsePlanPathArg(prompt) {
  const stripped = prompt.replace(RUNNER_TRIGGER_RE, "").trim();
  if (!stripped) return null;
  if (stripped.startsWith('"') || stripped.startsWith("'")) {
    const quote = stripped[0];
    const close = stripped.indexOf(quote, 1);
    if (close === -1) return stripped.slice(1).trim();
    return stripped.slice(1, close).trim();
  }
  const m = stripped.match(/^(\S+)/);
  return m ? m[1] : null;
}

/**
 * Windows 백슬래시 경로를 POSIX 슬래시 경로로 변환한다.
 * JSON·로그·문자열 매칭에서 OS 차이를 제거하기 위함이다.
 *
 * @param {string} p - 변환할 경로.
 * @returns {string} POSIX 형식 경로.
 */
function toPosix(p) {
  return String(p).replace(/\\/g, "/");
}

/**
 * 훅 진입점. stdin을 읽어 `/runner` 명령을 감지하고,
 * 검증 결과에 따라 컨텍스트 emit·차단·silent pass-through 중 하나를 수행한다.
 */
function main() {
  const input = parseInput(readStdin());
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (!RUNNER_TRIGGER_RE.test(prompt)) return; // /runner가 아니면 조용히 통과

  try {
    const rawArg = parsePlanPathArg(prompt);
    if (!rawArg) {
      throw new Error(
        "/runner 명령에 plan 파일 경로 인자가 없습니다.\n" +
        "예: /runner plans/login-frontend.plan.md\n" +
        "    /runner plans/login-frontend/plan.md",
      );
    }

    const cwd =
      (typeof input.cwd === "string" && input.cwd) ||
      process.env.CLAUDE_PROJECT_DIR ||
      process.cwd();
    const abs = path.isAbsolute(rawArg) ? rawArg : path.resolve(cwd, rawArg);
    const absPosix = toPosix(abs);

    if (!fs.existsSync(absPosix)) {
      throw new Error(
        `Plan 파일을 찾을 수 없습니다: ${rawArg}\n` +
        `(${absPosix}). cwd 또는 경로를 확인하세요.`,
      );
    }

    const base = path.basename(absPosix);
    if (!absPosix.endsWith(".plan.md") && base !== "plan.md") {
      throw new Error(
        `Plan 파일은 .plan.md 확장자이거나 폴더 안의 plan.md 여야 합니다: ${rawArg}`,
      );
    }

    emitContext(absPosix);
  } catch (err) {
    emitBlock(err?.message ?? String(err));
  }
}

main();
