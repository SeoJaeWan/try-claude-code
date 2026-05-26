#!/usr/bin/env node

// UserPromptSubmit hook — minimal /runner path-sanity gate.
//
// Fires before Claude Code processes the user's prompt. When the user types
// `/runner <plan-path>`, this hook does three things and nothing else:
//
//   1. Parse the plan-path argument from the prompt.
//   2. Verify the path resolves to an existing file whose name matches
//      `*.plan.md` or `plan.md`.
//   3. Emit a `[runner-skill bootstrap]` context line carrying the absolute
//      path so the runner skill can take over.
//
// Anything more — frontmatter parsing, state-path derivation, state-file
// creation, `base_branch` capture, slug-mismatch detection — lives in Step 1
// of the runner skill prose. The hook's only job is to refuse the obvious
// mistakes (missing argument, typo'd path, wrong filename shape) before the
// prompt reaches Claude. Anything else surfaces in the skill as a polite
// stop, and that is acceptable.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const RUNNER_TRIGGER_RE = /^\s*\/runner(?:\s|$)/;

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

function emitContext(planPathAbs) {
  emit({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `[runner-skill bootstrap]\n  plan_path: ${planPathAbs}`,
    },
  });
}

function emitBlock(reason) {
  emit({
    decision: "block",
    reason: `[runner] /runner 진입을 차단했습니다.\n\n${reason}`,
  });
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

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

// Pull the plan path from a prompt of the form `/runner <plan-path>` or
// `/runner "<plan-path with spaces>"`. Anything beyond the first argument
// is ignored — runner takes one plan per invocation.
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

function toPosix(p) {
  return String(p).replace(/\\/g, "/");
}

function main() {
  const input = parseInput(readStdin());
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (!RUNNER_TRIGGER_RE.test(prompt)) return; // silent pass-through

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
