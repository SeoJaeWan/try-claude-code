import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  createInitialState,
  saveState,
} from "../lib/runner-state.mjs";

// UserPromptSubmit hook is integration-tested by spawning the hook script
// against a synthetic plugin/project layout. The hook now performs three
// jobs: validate plan + frontmatter, refuse re-entry if `.merged` marker
// exists, create or load state and emit the bootstrap context.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(SCRIPT_DIR, "..", "user-prompt-submit-hook.mjs");

let tmpRoot;
let pluginRoot;
let projectRoot;
let pluginDataDir;
let counter = 0;

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ups-hook-test-"));

  pluginRoot = path.join(tmpRoot, "plugin");
  fs.mkdirSync(path.join(pluginRoot, "agents"), { recursive: true });
  fs.writeFileSync(
    path.join(pluginRoot, "agents", "general-developer.md"),
    "# stub\n",
  );

  projectRoot = path.join(tmpRoot, "project");
  fs.mkdirSync(path.join(projectRoot, "plans"), { recursive: true });

  spawnSync("git", ["-C", projectRoot, "init", "-q", "-b", "main"], { stdio: "ignore" });
  spawnSync("git", ["-C", projectRoot, "config", "user.email", "t@t"], { stdio: "ignore" });
  spawnSync("git", ["-C", projectRoot, "config", "user.name", "t"], { stdio: "ignore" });
  fs.writeFileSync(path.join(projectRoot, "README.md"), "x");
  spawnSync("git", ["-C", projectRoot, "add", "-A"], { stdio: "ignore" });
  spawnSync("git", ["-C", projectRoot, "commit", "-q", "-m", "init"], { stdio: "ignore" });

  pluginDataDir = path.join(tmpRoot, "plugin-data");
  fs.mkdirSync(pluginDataDir, { recursive: true });
});

after(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

function makePlanFile(slug, branch, ownerAgent = "general-developer") {
  counter += 1;
  const file = path.join(projectRoot, "plans", `${slug}.plan.md`);
  fs.writeFileSync(
    file,
    [
      "---",
      `plan_slug: ${slug}`,
      `branch: ${branch}`,
      `owner_agent: ${ownerAgent}`,
      "---",
      "",
      "# stub plan",
    ].join("\n"),
  );
  return file;
}

function makeFolderPlanFile(dir, planSlug, branch, ownerAgent = "general-developer") {
  counter += 1;
  const planDir = path.join(projectRoot, "plans", dir);
  fs.mkdirSync(planDir, { recursive: true });
  const file = path.join(planDir, "plan.md");
  fs.writeFileSync(
    file,
    [
      "---",
      `plan_slug: ${planSlug}`,
      `branch: ${branch}`,
      `owner_agent: ${ownerAgent}`,
      "---",
      "",
      "# stub plan",
    ].join("\n"),
  );
  return file;
}

function runHook({ prompt, sessionId }) {
  const stdin = JSON.stringify({ prompt, cwd: projectRoot, session_id: sessionId });
  return spawnSync(process.execPath, [HOOK], {
    input: stdin,
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: pluginRoot,
      CLAUDE_PROJECT_DIR: projectRoot,
      CLAUDE_PLUGIN_DATA: pluginDataDir,
    },
  });
}

function seedStateFile(planSlug, branch, devPhase = null) {
  const stateDir = path.join(projectRoot, "plans", planSlug);
  fs.mkdirSync(stateDir, { recursive: true });
  const statePath = path.join(stateDir, ".runner-state.json");
  const state = createInitialState({
    planSlug,
    planPath: path.join(projectRoot, "plans", `${planSlug}.plan.md`),
    ownerAgent: "general-developer",
    baseBranch: "main",
    taskBranch: branch,
    worktreePath: path.join(projectRoot, "worktrees", branch.replace(/\//g, "-")),
  });
  if (devPhase) state.dev_review.phase = devPhase;
  saveState(statePath, state);
  return statePath;
}

// ---------------------------------------------------------------------------

describe("UserPromptSubmit /runner bootstrap", () => {
  it("emits bootstrap context for a fresh /runner invocation", () => {
    counter += 1;
    const slug = `plan-fresh-${counter}`;
    makePlanFile(slug, `feat/${slug}`);
    const r = runHook({ prompt: `/runner plans/${slug}.plan.md`, sessionId: "sess-1" });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.hookSpecificOutput, "expected additionalContext payload");
    assert.match(out.hookSpecificOutput.additionalContext, /\[runner-skill bootstrap\]/);
    assert.match(out.hookSpecificOutput.additionalContext, /mode: fresh/);
  });

  it("emits bootstrap with mode=resume when a state file already exists", () => {
    counter += 1;
    const slug = `plan-resume-${counter}`;
    makePlanFile(slug, `feat/${slug}`);
    seedStateFile(slug, `feat/${slug}`, "awaiting");
    const r = runHook({ prompt: `/runner plans/${slug}.plan.md`, sessionId: "sess-2" });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.hookSpecificOutput);
    assert.match(out.hookSpecificOutput.additionalContext, /mode: resume/);
  });

  it("rejects /runner when .merged marker exists in the plan dir", () => {
    counter += 1;
    const slug = `plan-merged-${counter}`;
    makePlanFile(slug, `feat/${slug}`);
    const stateDir = path.join(projectRoot, "plans", slug);
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, ".merged"), "");

    const r = runHook({ prompt: `/runner plans/${slug}.plan.md`, sessionId: "sess-merged" });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block", "merged plan must be rejected");
    assert.match(out.reason, /이미 머지 완료/);
    assert.match(out.reason, /\.merged/);
  });

  it("rejects /runner with no plan path argument", () => {
    const r = runHook({ prompt: "/runner", sessionId: "sess-noarg" });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /plan 파일 경로 인자가 없습니다/);
  });

  it("rejects /runner when plan file does not exist", () => {
    const r = runHook({
      prompt: "/runner plans/does-not-exist.plan.md",
      sessionId: "sess-missing",
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /찾을 수 없습니다/);
  });

  it("rejects plan slug mismatch on resume", () => {
    counter += 1;
    const slug = `plan-mismatch-${counter}`;
    makePlanFile(slug, `feat/${slug}`);
    // Seed state with a different plan_slug to simulate the user renaming.
    const stateDir = path.join(projectRoot, "plans", slug);
    fs.mkdirSync(stateDir, { recursive: true });
    const statePath = path.join(stateDir, ".runner-state.json");
    const state = createInitialState({
      planSlug: `old-${slug}`,
      planPath: path.join(projectRoot, "plans", `${slug}.plan.md`),
      ownerAgent: "general-developer",
      baseBranch: "main",
      taskBranch: `feat/${slug}`,
      worktreePath: path.join(projectRoot, "worktrees", `feat-${slug}`),
    });
    saveState(statePath, state);

    const r = runHook({ prompt: `/runner plans/${slug}.plan.md`, sessionId: "sess-mismatch" });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /plan_slug 불일치/);
  });

  it("accepts a bare plan.md inside a named directory", () => {
    counter += 1;
    const dir = `wanted-design-${counter}`;
    makeFolderPlanFile(dir, dir, `feat/${dir}`);
    const r = runHook({
      prompt: `/runner plans/${dir}/plan.md`,
      sessionId: `sess-folder-${counter}`,
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(out.hookSpecificOutput);
    // The state file lives at plans/<dir>/.runner-state.json, NOT inside a
    // nested plan/ subdirectory.
    assert.match(
      out.hookSpecificOutput.additionalContext,
      new RegExp(`${dir}/\\.runner-state\\.json`),
    );
  });

  it("ignores prompts that are not /runner", () => {
    const r = runHook({ prompt: "hello, claude", sessionId: "sess-ignore" });
    assert.equal(r.status, 0);
    // No stdout payload — hook stays silent for unrelated prompts.
    assert.equal(r.stdout.trim(), "");
  });
});
