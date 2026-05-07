import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  STATUS,
  createInitialState,
  saveState,
  transitionStatus,
} from "../lib/runner-state.mjs";

// UserPromptSubmit hook is integration-tested by spawning the hook script
// against a synthetic plugin/project layout. The change under test is the
// "single active plan per session" rule: a fresh /runner invocation must
// reject when another non-terminal plan is registered to the same session.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(SCRIPT_DIR, "..", "user-prompt-submit-hook.mjs");

let tmpRoot;
let pluginRoot;
let projectRoot;
let pluginDataDir;

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ups-hook-test-"));

  // Synthetic plugin root with one agent file the plan can name.
  pluginRoot = path.join(tmpRoot, "plugin");
  fs.mkdirSync(path.join(pluginRoot, "agents"), { recursive: true });
  fs.writeFileSync(
    path.join(pluginRoot, "agents", "general-developer.md"),
    "# stub\n",
  );

  // Synthetic project root that hosts plans/ and (later) plan-state files.
  projectRoot = path.join(tmpRoot, "project");
  fs.mkdirSync(path.join(projectRoot, "plans"), { recursive: true });

  // Initialize a git repo so detectBaseBranch(cwd) returns something stable.
  spawnSync("git", ["-C", projectRoot, "init", "-q", "-b", "main"], {
    stdio: "ignore",
  });
  spawnSync("git", ["-C", projectRoot, "config", "user.email", "t@t"], {
    stdio: "ignore",
  });
  spawnSync("git", ["-C", projectRoot, "config", "user.name", "t"], {
    stdio: "ignore",
  });
  fs.writeFileSync(path.join(projectRoot, "README.md"), "x");
  spawnSync("git", ["-C", projectRoot, "add", "-A"], { stdio: "ignore" });
  spawnSync(
    "git",
    ["-C", projectRoot, "commit", "-q", "-m", "init"],
    { stdio: "ignore" },
  );

  pluginDataDir = path.join(tmpRoot, "plugin-data");
  fs.mkdirSync(pluginDataDir, { recursive: true });
});

after(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});

let counter = 0;

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

function runHook({ prompt, sessionId }) {
  const stdin = JSON.stringify({
    prompt,
    cwd: projectRoot,
    session_id: sessionId,
  });
  return spawnSync(process.execPath, [HOOK], {
    input: stdin,
    encoding: "utf8",
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: pluginRoot,
      CLAUDE_PROJECT_DIR: projectRoot,
      CLAUDE_PLUGIN_DATA: pluginDataDir,
      // Force a known sessions location even when the env above misses.
    },
  });
}

function makeSessionWithActivePlan(sessionId, planSlug, branch, status) {
  // Create a state file for the "other" plan on disk and register it in the
  // session's activePlanStates pointer list.
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
    sessionId,
  });
  // Walk to the requested status.
  const path1 = [
    STATUS.VALIDATING,
    STATUS.DISPATCHING,
    STATUS.AWAITING_STOP_REVIEW,
    STATUS.AWAITING_DEV_REVIEW,
    STATUS.APPROVED,
    STATUS.MERGED,
  ];
  const idx = path1.indexOf(status);
  if (idx > 0) {
    for (let i = 1; i <= idx; i += 1) transitionStatus(state, path1[i]);
  }
  saveState(statePath, state);

  // Write a session JSON that already points at it.
  const sessionsDir = path.join(pluginDataDir, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, `${sessionId}.json`),
    JSON.stringify({
      sessionId,
      createdAt: new Date().toISOString(),
      cwd: projectRoot,
      activePlanStates: [statePath],
      stopReviewThreadId: null,
    }, null, 2),
  );
  return statePath;
}

// ---------------------------------------------------------------------------

describe("UserPromptSubmit single-active-plan rule", () => {
  it("rejects a new /runner when another plan is mid-flight in the same session", () => {
    const sessionId = `sess-${++counter}`;
    makeSessionWithActivePlan(
      sessionId,
      "plan-a",
      "feat/plan-a",
      STATUS.AWAITING_DEV_REVIEW,
    );
    makePlanFile("plan-b", "feat/plan-b");

    const r = runHook({
      prompt: "/runner plans/plan-b.plan.md",
      sessionId,
    });
    assert.equal(r.status, 0, "hook itself exits 0 even when blocking");
    const decision = JSON.parse(r.stdout);
    assert.equal(decision.decision, "block");
    assert.match(decision.reason, /이미 진행 중인 plan/);
    assert.match(decision.reason, /plan-a/);
  });

  it("ignores terminal (merged) plans when checking for collisions", () => {
    const sessionId = `sess-${++counter}`;
    makeSessionWithActivePlan(
      sessionId,
      "plan-merged",
      "feat/plan-merged",
      STATUS.MERGED,
    );
    makePlanFile("plan-fresh", "feat/plan-fresh");

    const r = runHook({
      prompt: "/runner plans/plan-fresh.plan.md",
      sessionId,
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    // additionalContext, not block — the merged sibling should not gate us.
    assert.ok(out.hookSpecificOutput, "expected additionalContext payload");
    assert.equal(out.hookSpecificOutput.hookEventName, "UserPromptSubmit");
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /\[runner-skill bootstrap\]/,
    );
  });

  it("allows resume of the same plan in a session where it is the only active record", () => {
    const sessionId = `sess-${++counter}`;
    makeSessionWithActivePlan(
      sessionId,
      "plan-resume",
      "feat/plan-resume",
      STATUS.AWAITING_DEV_REVIEW,
    );
    // The plan file must exist for the hook to validate frontmatter on resume.
    makePlanFile("plan-resume", "feat/plan-resume");

    const r = runHook({
      prompt: "/runner plans/plan-resume.plan.md",
      sessionId,
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    // Resume returns additionalContext, not a block.
    assert.ok(out.hookSpecificOutput, "resume should pass through");
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /mode: resume/,
    );
  });
});
