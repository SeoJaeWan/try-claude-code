import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(pluginRoot, "skills");
const skills = ["shape", "memory-update", "prepare", "execute-task", "finalize"];
const referenceFiles = {
  shape: "shape-report.md",
  "memory-update": "memory-change-set.md",
  prepare: "execution-plan.md",
  "execute-task": "task-execution.md",
  finalize: "finalization-report.md",
};

function skillDocument(name) {
  return fs.readFileSync(path.join(skillsRoot, name, "SKILL.md"), "utf8");
}

function referenceDocument(name) {
  return fs.readFileSync(
    path.join(skillsRoot, name, "references", referenceFiles[name]),
    "utf8",
  );
}

function skillBundle(name) {
  const skill = skillDocument(name);
  const reference = referenceDocument(name);
  const file = referenceFiles[name].replaceAll(".", "\\.");
  assert.match(skill, new RegExp(`\\[references/${file}\\]\\(references/${file}\\)`));
  return `${skill}\n\n${reference}`;
}

function assertContract(text, checks, label) {
  for (const [name, pattern] of checks) {
    assert.match(text, pattern, `${label} must define ${name}`);
  }
}

test("each skill is producer-neutral and never references another Workbench selector", () => {
  for (const skill of skills) {
    const text = skillBundle(skill);
    const selectors = [...text.matchAll(/\$workbench:([a-z0-9-]+)/g)].map((match) => match[1]);
    assert.deepEqual([...new Set(selectors)], [skill], `${skill} may advertise only itself`);
    assert.doesNotMatch(text, /automatically invoke another Workbench skill/i);
    assert.doesNotMatch(text, /next (?:skill|stage)|passed directly to \$workbench/i);
  }
});

test("Shape is a concise standalone read-only investigation", () => {
  const text = skillBundle("shape");
  assertContract(text, [
    ["content-sensitive snapshot", /content-sensitive snapshot/i],
    ["Local Work Memory evidence", /Local Work Memory/i],
    ["Context7 research", /Context7/i],
    ["Jira evidence", /Jira/i],
    ["Figma evidence", /Figma/i],
    ["requirements", /requirements/i],
    ["acceptance", /acceptance criteria/i],
    ["architecture decisions", /architecture decisions/i],
    ["read-only boundary", /Do NOT modify repository files/i],
  ], "shape");
  assert.doesNotMatch(text, /execution_worktree_policy|worktrees_materialized|task packet/i);
  assert.ok(skillDocument("shape").split(/\r?\n/).length < 80, "Shape entrypoint must stay concise");
});

test("Shape report preserves snapshot and evidence integrity without handoff fields", () => {
  const text = referenceDocument("shape");
  assertContract(text, [
    ["raw status", /git status --porcelain=v1 -z --untracked-files=all/],
    ["raw bytes", /raw bytes without newline normalization/i],
    ["untracked hashes", /hashing file bytes or symlink-target bytes/i],
    ["versioned fingerprint", /workbench-status-fingerprint/],
    ["length framing", /unsigned 64-bit big-endian byte length/i],
    ["fact labeling", /Fact \/ repository-fact/],
    ["decision lifecycle", /decision_status: proposed \| accepted \| superseded/],
  ], "shape report");
  assert.doesNotMatch(text, /shape_report_id|Prepare input|Direct handoff|다음 선택지/);
});

test("Prepare accepts any sufficient change definition and emits an isolated plan", () => {
  const text = skillBundle("prepare");
  assertContract(text, [
    ["producer-neutral input", /Do not require a particular producer or document type/i],
    ["dependency DAG", /dependency DAG/i],
    ["parallel safety", /same immutable base/i],
    ["collision surfaces", /indirect collision surfaces/i],
    ["baseline", /establish the baseline/i],
    ["no materialization", /worktrees_materialized: false/],
    ["no coordinator", /There is no coordinator worktree/i],
    ["final integration seal", /final integration-seal task/i],
  ], "prepare");
  assert.doesNotMatch(text, /READY Shape Report|shape_input|shape_report_id/);
  assert.ok(skillDocument("prepare").split(/\r?\n/).length < 80, "Prepare entrypoint must stay concise");
});

test("Execute Task supports standalone and packet execution without a named planner", () => {
  const text = skillBundle("execute-task");
  assertContract(text, [
    ["standalone input", /standalone task objective/i],
    ["packet input", /complete execution packet/i],
    ["producer neutrality", /Do not require a particular planning tool or producer/i],
    ["worktree materialization", /git worktree add -b/],
    ["immutable dependencies", /immutable result SHAs/i],
    ["binding digest", /execution_binding_digest/],
    ["task-local commit", /task-local commit/i],
    ["failure preservation", /diagnostic evidence/i],
  ], "execute-task");
  assert.doesNotMatch(text, /READY Execution Plan|Shape Report|Prepare artifact|RESHAPE_REQUIRED|REPREPARE_REQUIRED/);
  assert.ok(skillDocument("execute-task").split(/\r?\n/).length < 80, "Execute entrypoint must stay concise");
});

test("Memory Update delegates MCP mechanics while preserving Workbench boundaries", () => {
  const text = skillBundle("memory-update");
  assertContract(text, [
    ["single artifact", /exactly one complete artifact/i],
    ["producer neutrality", /Do not require a particular producer/i],
    ["MCP authority", /MCP as authoritative/i],
    ["invocation-time contract", /contract it exposes at invocation time/i],
    ["no meaning change", /without reinterpretation/i],
    ["no invented MCP values", /Do not invent values or references owned by the MCP/i],
    ["no approval", /approval was granted \(`false`\)/i],
    ["no continuation", /additional work was started \(`false`\)/i],
  ], "memory-update");
  assert.doesNotMatch(text, /shape_status|plan_status|Shape or Prepare|persistence_required_for_/);
  assert.ok(skillDocument("memory-update").split(/\r?\n/).length < 70, "Memory entrypoint must stay concise");
});

test("Finalize reviews any immutable integrated Git change independently of its history", () => {
  const text = skillBundle("finalize");
  assertContract(text, [
    ["immutable Git range", /base_commit.+head_sha/s],
    ["producer independence", /independent of how it was planned or implemented/i],
    ["optional evidence", /Optional supporting evidence/i],
    ["risk-driven checks", /failure, concurrency, lifecycle, consistency, and load/i],
    ["independent review", /independent review/i],
    ["required check gate", /unverified acceptance-critical checks prevent `FINALIZED`/i],
    ["clean final state", /dirty final worktree/i],
  ], "finalize");
  assert.doesNotMatch(text, /complete ready Shape Report|complete ready Execution Plan|all required Task Results|INTEGRATION_REQUIRED/);
  assert.ok(skillDocument("finalize").split(/\r?\n/).length < 80, "Finalize entrypoint must stay concise");
});
