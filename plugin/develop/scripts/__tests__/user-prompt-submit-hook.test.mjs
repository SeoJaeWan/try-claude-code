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
// against a synthetic plugin/project layout. The fresh-start branch no
// longer enforces "one /runner per terminal" — the session slot is
// informational, and setActivePlan overwrites with a stderr warning when
// the pointer changes. These tests pin the new behaviour: a second
// /runner in the same session passes through to a bootstrap, and the
// session.json's activePlan slot reflects the latest plan.

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

// Write a bare `plan.md` inside `plans/<dir>/`. State will live at
// `plans/<dir>/.runner-state.json` because the directory itself is plan_key.
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
  // session's activePlan slot.
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
  // Walk to the requested status (v2 enum). The five-status graph means each
  // step is a single transitionStatus + an optional phase set; we don't care
  // about phase here because UserPromptSubmit only checks TERMINAL_STATUSES.
  const path1 = [
    STATUS.PREPARING,
    STATUS.DISPATCHING,
    STATUS.DEV_REVIEWING,
    STATUS.CLOSING,
    STATUS.MERGED,
  ];
  const idx = path1.indexOf(status);
  if (idx > 0) {
    for (let i = 1; i <= idx; i += 1) transitionStatus(state, path1[i]);
  }
  saveState(statePath, state);

  // Write a session JSON that already points at it via the single slot.
  const sessionsDir = path.join(pluginDataDir, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, `${sessionId}.json`),
    JSON.stringify({
      sessionId,
      cwd: projectRoot,
      activePlan: statePath.replace(/\\/g, "/"),
    }, null, 2),
  );
  return statePath;
}

function readSessionJson(sessionId) {
  const file = path.join(pluginDataDir, "sessions", `${sessionId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ---------------------------------------------------------------------------

describe("UserPromptSubmit active-plan slot behaviour", () => {
  it("allows a second /runner in the same session and overwrites the slot", () => {
    const sessionId = `sess-${++counter}`;
    makeSessionWithActivePlan(
      sessionId,
      "plan-a",
      "feat/plan-a",
      STATUS.DEV_REVIEWING,
    );
    makePlanFile("plan-b", "feat/plan-b");

    const r = runHook({
      prompt: "/runner plans/plan-b.plan.md",
      sessionId,
    });
    assert.equal(r.status, 0, "hook itself exits 0");
    const out = JSON.parse(r.stdout);
    // No more block — the second /runner passes through to a bootstrap.
    assert.ok(out.hookSpecificOutput, "expected additionalContext payload");
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /\[runner-skill bootstrap\]/,
    );
    // The session's activePlan slot now points at plan-b's state file.
    const session = readSessionJson(sessionId);
    assert.ok(session, "session.json must exist");
    assert.match(session.activePlan, /plan-b\/\.runner-state\.json$/);
  });

  it("passes through when the prior slot points at a merged plan", () => {
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
    // additionalContext, not block — there is no collision check anymore.
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
      STATUS.DEV_REVIEWING,
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

  // The runner accepts two plan-file shapes — `<name>.plan.md` (named plan,
  // nested under a stem directory) and `<dir>/plan.md` (the directory is the
  // plan_key). These two cases pin the second shape so a regression in path
  // derivation shows up here, not at first dispatch.
  it("accepts a bare plan.md inside a named directory", () => {
    const sessionId = `sess-${++counter}`;
    makeFolderPlanFile(
      "wanted-design-system-mvp",
      "wanted-design-system-mvp",
      "feat/wanted-mvp",
    );
    const r = runHook({
      prompt: "/runner plans/wanted-design-system-mvp/plan.md",
      sessionId,
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(
      out.hookSpecificOutput,
      "plan.md form should pass validation and produce a bootstrap",
    );
    // The bootstrap names the state file — folder-as-key means it lives at
    // `plans/wanted-design-system-mvp/.runner-state.json`, NOT inside a
    // nested `plan/` subdirectory.
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /wanted-design-system-mvp\/.runner-state\.json/,
    );
    assert.doesNotMatch(
      out.hookSpecificOutput.additionalContext,
      /wanted-design-system-mvp\/plan\/.runner-state\.json/,
    );
  });

});
