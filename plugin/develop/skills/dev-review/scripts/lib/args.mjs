import process from "node:process";

// runner-state 마이그레이션 과정에서 헬퍼 CLI가 단순해졌다. plan 단위 입력은
// 모두 plan-state JSON 안에 있으므로, 헬퍼는 `--state-path` 만 필요로 한다.
// `--out` 은 선택값이며 생략하면 `{state-dir}/dev-review/review-data.json`
// (state 파일 옆) 위치에 기록한다.

const FLAGS = {
  string: new Set([
    "--state-path",
    "--out",
    "--diffs-dir",
    "--log-level",
    "--now",
  ]),
  repeatable: new Set(["--available-agents-dir"]),
};

const REQUIRED = ["--state-path"];

/**
 * argv 배열을 파싱해 옵션 객체를 만든다. 알 수 없는 플래그·값 누락·필수
 * 누락은 exitCode=2 가 부착된 Error 로 던진다.
 *
 * @param {string[]} argv - process.argv 전체 배열.
 * @returns {{statePath: string, out?: string, diffsDir?: string,
 *   logLevel: string, now?: string, availableAgentsDirs: string[]}}
 */
export function parseArgs(argv) {
  const raw = argv.slice(2);
  const out = { availableAgentsDirs: [] };

  for (let i = 0; i < raw.length; i += 1) {
    const flag = raw[i];
    if (!flag.startsWith("--")) {
      throw invalid(`unexpected positional argument: ${flag}`);
    }
    const value = raw[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw invalid(`missing value for ${flag}`);
    }
    i += 1;

    if (FLAGS.string.has(flag)) {
      out[camelize(flag)] = value;
    } else if (FLAGS.repeatable.has(flag)) {
      out.availableAgentsDirs.push(value);
    } else {
      throw invalid(`unknown flag: ${flag}`);
    }
  }

  for (const req of REQUIRED) {
    if (out[camelize(req)] === undefined) {
      throw invalid(`missing required flag: ${req}`);
    }
  }

  out.logLevel = out.logLevel || "warn";
  if (!["error", "warn", "info", "debug"].includes(out.logLevel)) {
    throw invalid(`invalid --log-level: ${out.logLevel}`);
  }

  return out;
}

/**
 * --kebab-case 플래그명을 camelCase 키로 변환한다.
 *
 * @param {string} flag - "--state-path" 같은 플래그명.
 * @returns {string} "statePath" 같은 camelCase 키.
 */
function camelize(flag) {
  return flag
    .replace(/^--/, "")
    .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

/**
 * 인자 검증 에러를 만든다. exitCode=2 가 부착되며, 호출자는 이를 사용해
 * 명령 종료 코드를 일관되게 유지한다.
 *
 * @param {string} message - 에러 메시지.
 * @returns {Error}
 */
function invalid(message) {
  const err = new Error(message);
  err.exitCode = 2;
  return err;
}

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * stderr에 단순 prefix 로그를 출력하는 로거를 생성한다. level 임계값 이하의
 * 호출은 출력되지 않는다.
 *
 * @param {("error"|"warn"|"info"|"debug")} level - 출력 임계 레벨.
 * @returns {{error: Function, warn: Function, info: Function, debug: Function}}
 */
export function createLogger(level) {
  const threshold = LEVELS[level] ?? 1;
  return {
    error: (msg) => LEVELS.error <= threshold && write("error", msg),
    warn: (msg) => LEVELS.warn <= threshold && write("warn", msg),
    info: (msg) => LEVELS.info <= threshold && write("info", msg),
    debug: (msg) => LEVELS.debug <= threshold && write("debug", msg),
  };
}

/**
 * 실제 로그 한 줄을 stderr 에 출력한다.
 *
 * @param {string} level - 표시할 레벨 라벨.
 * @param {string} message - 로그 메시지.
 */
function write(level, message) {
  process.stderr.write(`[dev-review-gen] ${level} ${message}\n`);
}
