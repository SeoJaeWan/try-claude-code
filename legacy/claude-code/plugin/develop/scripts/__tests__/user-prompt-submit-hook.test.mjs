import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(SCRIPT_DIR, "..", "user-prompt-submit-hook.mjs");

let tmpDir;
let counter = 0;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "user-prompt-hook-test-"));
});

after(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

/**
 * 훅 스크립트를 자식 프로세스로 실행하고 stdin 으로 prompt/cwd JSON 을
 * 전달한다. stdout 은 JSON 으로 파싱해 함께 반환한다.
 *
 * @param {{prompt: string, cwd?: string}} opts - 훅에 전달할 입력.
 * @returns {{status: number, stdout: string, stderr: string, json: object|null}}
 */
function runHook({ prompt, cwd = tmpDir }) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ prompt, cwd }),
    encoding: "utf8",
  });
  return {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    json: r.stdout ? safeJson(r.stdout) : null,
  };
}

/**
 * 문자열을 JSON 으로 안전하게 파싱한다. 실패하면 null 을 반환한다.
 *
 * @param {string} s - 파싱할 문자열.
 * @returns {object|null}
 */
function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

/**
 * tmpDir 하위 상대 경로에 더미 plan 파일을 만들어 절대 경로를 반환한다.
 *
 * @param {string} rel - tmpDir 기준 상대 경로.
 * @returns {string} 생성된 파일의 절대 경로.
 */
function writePlan(rel) {
  const abs = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, "---\nplan_slug: x\nbranch: feat/x\nowner_agent: a\n---\n");
  return abs;
}

// ---------------------------------------------------------------------------
// 트리거 감지
// ---------------------------------------------------------------------------

describe("트리거 감지", () => {
  it("/runner 가 아닌 프롬프트는 조용히 통과시킨다", () => {
    const r = runHook({ prompt: "hello, please review my PR" });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  });

  it("빈 프롬프트는 조용히 통과시킨다", () => {
    const r = runHook({ prompt: "" });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  });
});

// ---------------------------------------------------------------------------
// 잘못된 입력 차단
// ---------------------------------------------------------------------------

describe("잘못된 입력 차단", () => {
  it("/runner 에 plan 경로 인자가 없으면 차단한다", () => {
    const r = runHook({ prompt: "/runner" });
    assert.equal(r.json?.decision, "block");
    assert.match(r.json.reason, /경로 인자가 없습니다/);
  });

  it("plan 파일이 존재하지 않으면 차단한다", () => {
    const r = runHook({ prompt: "/runner plans/does-not-exist.plan.md" });
    assert.equal(r.json?.decision, "block");
    assert.match(r.json.reason, /찾을 수 없습니다/);
  });

  it("파일명이 .plan.md 또는 plan.md 가 아니면 차단한다", () => {
    counter += 1;
    const file = path.join(tmpDir, `notes-${counter}.md`);
    fs.writeFileSync(file, "not a plan");
    const r = runHook({ prompt: `/runner notes-${counter}.md` });
    assert.equal(r.json?.decision, "block");
    assert.match(r.json.reason, /\.plan\.md/);
  });
});

// ---------------------------------------------------------------------------
// 부트스트랩 컨텍스트 emit
// ---------------------------------------------------------------------------

describe("부트스트랩 컨텍스트", () => {
  it("유효한 <name>.plan.md 경로에 대해 plan_path 를 emit 한다", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/login.plan.md`);
    const r = runHook({ prompt: `/runner plans/p${counter}/login.plan.md` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, /\[runner-skill bootstrap\]/);
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });

  it("폴더의 plan.md 경로에 대해 plan_path 를 emit 한다", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/plan.md`);
    const r = runHook({ prompt: `/runner plans/p${counter}/plan.md` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, /\[runner-skill bootstrap\]/);
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });

  it("따옴표로 감싼 plan 경로를 처리한다", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/quoted.plan.md`);
    const r = runHook({ prompt: `/runner "plans/p${counter}/quoted.plan.md"` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });

  it("절대 경로 plan 도 수용한다", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/abs.plan.md`);
    const r = runHook({ prompt: `/runner ${abs}` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });
});
