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

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function writePlan(rel) {
  const abs = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, "---\nplan_slug: x\nbranch: feat/x\nowner_agent: a\n---\n");
  return abs;
}

// ---------------------------------------------------------------------------
// trigger detection
// ---------------------------------------------------------------------------

describe("trigger detection", () => {
  it("passes through silently when prompt is not /runner", () => {
    const r = runHook({ prompt: "hello, please review my PR" });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  });

  it("passes through silently when prompt is empty", () => {
    const r = runHook({ prompt: "" });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  });
});

// ---------------------------------------------------------------------------
// block on bad input
// ---------------------------------------------------------------------------

describe("block on bad input", () => {
  it("blocks when /runner has no plan path argument", () => {
    const r = runHook({ prompt: "/runner" });
    assert.equal(r.json?.decision, "block");
    assert.match(r.json.reason, /경로 인자가 없습니다/);
  });

  it("blocks when the plan file does not exist", () => {
    const r = runHook({ prompt: "/runner plans/does-not-exist.plan.md" });
    assert.equal(r.json?.decision, "block");
    assert.match(r.json.reason, /찾을 수 없습니다/);
  });

  it("blocks when the file name does not match .plan.md or plan.md", () => {
    counter += 1;
    const file = path.join(tmpDir, `notes-${counter}.md`);
    fs.writeFileSync(file, "not a plan");
    const r = runHook({ prompt: `/runner notes-${counter}.md` });
    assert.equal(r.json?.decision, "block");
    assert.match(r.json.reason, /\.plan\.md/);
  });
});

// ---------------------------------------------------------------------------
// emit bootstrap context
// ---------------------------------------------------------------------------

describe("bootstrap context", () => {
  it("emits plan_path for a valid <name>.plan.md", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/login.plan.md`);
    const r = runHook({ prompt: `/runner plans/p${counter}/login.plan.md` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, /\[runner-skill bootstrap\]/);
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });

  it("emits plan_path for a folder's plan.md", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/plan.md`);
    const r = runHook({ prompt: `/runner plans/p${counter}/plan.md` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, /\[runner-skill bootstrap\]/);
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });

  it("handles a quoted plan path", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/quoted.plan.md`);
    const r = runHook({ prompt: `/runner "plans/p${counter}/quoted.plan.md"` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });

  it("accepts an absolute plan path", () => {
    counter += 1;
    const abs = writePlan(`plans/p${counter}/abs.plan.md`);
    const r = runHook({ prompt: `/runner ${abs}` });
    assert.equal(r.status, 0);
    const ctx = r.json?.hookSpecificOutput?.additionalContext;
    assert.match(ctx, new RegExp(`plan_path: ${abs.replace(/\\/g, "/")}$`));
  });
});
