import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(pluginRoot, "skills");
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
  const escaped = referenceFiles[name].replaceAll(".", "\\.");
  assert.match(
    skill,
    new RegExp(`\\[references/${escaped}\\]\\(references/${escaped}\\)`),
    `${name} must link its tested reference directly`,
  );
  return `${skill}\n\n${reference}`;
}

function markdownSection(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const end = nextHeading === undefined
    ? text.length
    : text.indexOf(nextHeading, start + heading.length);
  assert.notEqual(end, -1, `missing section boundary ${nextHeading}`);
  return text.slice(start, end);
}

function assertContract(text, checks, label) {
  for (const [name, pattern] of checks) {
    assert.match(text, pattern, `${label} must define ${name}`);
  }
}

test("all workflow stages remain independently and explicitly invoked", () => {
  for (const skill of ["shape", "memory-update", "prepare", "execute-task", "finalize"]) {
    assert.match(
      skillDocument(skill),
      /^Do NOT automatically invoke another Workbench skill\.$/m,
      `${skill} must prohibit automatic Workbench chaining`,
    );
  }
});

test("Shape is a standalone read-only result with MCP-backed project evidence", () => {
  const text = skillBundle("shape");
  assertContract(
    text,
    [
      ["stages 0-4", /stages?\s+0\s*[–-]\s*4/i],
      ["Local Work Memory MCP", /Local Work Memory MCP/i],
      ["project conventions", /project conventions/i],
      ["Work Items", /Work Items/i],
      ["Workbench artifacts", /Workbench artifacts/i],
      ["Context7 research", /Context7/i],
      ["Jira evidence", /Jira[\s\S]{0,180}(?:issue|project)/i],
      ["Figma evidence", /Figma[\s\S]{0,180}(?:node|design)/i],
      ["fact labeling", /Fact \/ repository-fact/],
      ["inference labeling", /Inference/],
      ["decision labeling", /Decision/],
      ["assumption labeling", /Assumption/],
      ["primary Local support", /Primary Local is a valid read-only Shape environment/i],
      ["task-scoped execution policy", /execution_worktree_policy: task_scoped/],
      ["direct Prepare handoff", /passed directly to `?\$workbench:prepare`?/i],
      ["optional persistence", /optionally persisted/i],
      ["write prohibition", /Do NOT call a Local Work Memory write tool/i],
    ],
    "shape",
  );

  assert.match(text, /creates no worktree/i);
  assert.match(text, /Do not create a Codex task/i);
  assert.doesNotMatch(text, /Dev Wiki Artifact Change Set|must be persisted|not Prepare-ready/i);
});

test("Shape report carries a complete direct handoff contract", () => {
  const contract = referenceDocument("shape");
  const report = markdownSection(contract, "## Required report sections", "## Direct handoff");

  for (const heading of [
    "# Shape 보고서",
    "## 상태",
    "## 분석 checkout 및 기준 스냅샷",
    "## 요청 정의",
    "## 단계 0 — Local Work Memory",
    "## 단계 0 — Jira 및 Figma 근거",
    "## 단계 0 — 저장소 탐색",
    "## 요구사항",
    "## 불변 조건",
    "## 수락 기준",
    "## 조사 및 출처",
    "## 아키텍처 결정",
    "## 위험 및 미해결 질문",
    "## 실행 영향 및 고려사항",
    "## 다음 선택지",
  ]) {
    assert.ok(report.includes(heading), `Shape report must include ${heading}`);
  }

  for (const field of [
    "shape_status:",
    "run_id:",
    "shape_report_id:",
    "repository_id:",
    "analysis_worktree_required: false",
    "execution_worktree_policy: task_scoped",
    "status_fingerprint_version: v1",
    "status_fingerprint_complete: true | false",
    "decision_status: proposed | accepted | superseded",
  ]) {
    assert.ok(report.includes(field), `Shape report must preserve ${field}`);
  }

  assert.match(contract, /complete `READY` Shape Report is the Prepare input contract/i);
  assert.match(contract, /without a Memory Update Result/i);
  assert.match(contract, /persistence provides durable retrieval, not workflow approval/i);
});

test("Shape preserves content-sensitive snapshot evidence", () => {
  const contract = referenceDocument("shape");
  assertContract(
    contract,
    [
      ["porcelain status bytes", /git status --porcelain=v1 -z --untracked-files=all/],
      ["raw byte capture", /Capture raw stdout bytes without newline normalization/i],
      ["staged and unstaged content", /`staged_diff`:[\s\S]{0,250}`unstaged_diff`:/i],
      ["untracked hashes", /hash regular file bytes or raw symlink-target bytes/i],
      ["versioned fingerprint", /workbench-status-fingerprint/],
      ["length framing", /unsigned 64-bit big-endian byte length/i],
      ["coherent state check", /state that changes while the snapshot is being captured/i],
    ],
    "shape report",
  );
});

test("Memory Update is optional MCP-backed Workbench Artifact persistence", () => {
  const text = skillBundle("memory-update");
  assertContract(
    text,
    [
      ["optional persistence", /optional artifact storage/i],
      ["single selected result", /exactly one user-selected completed Shape or Prepare result/i],
      ["Local Work Memory MCP", /Local Work Memory MCP/i],
      ["artifact commit", /artifact commit capability/i],
      ["immutable artifact", /immutable Workbench Artifact/i],
      ["stable folders", /`shape` for a Shape Report and `prepare` for an Execution Plan/i],
      ["no Dev Wiki mutation", /not current project knowledge/i],
      ["MCP-owned mechanics", /Follow the MCP tool schema and result contract/i],
      ["exact reference", /exact MCP Typed Reference/i],
      ["no workflow permission", /never approves, starts, or blocks another Workbench skill/i],
    ],
    "memory-update",
  );

  assert.match(text, /persistence_required_for_prepare: false/);
  assert.match(text, /persistence_required_for_execute: false/);
  assert.match(text, /persistence_required_for_finalize: false/);
  assert.doesNotMatch(text, /memory_write|Dev Wiki reference|APPLIED\/indexed/);
});

test("Prepare accepts inline or referenced Shape without a persistence gate", () => {
  const text = skillBundle("prepare");
  assertContract(
    text,
    [
      ["stages 6-7", /stages?\s+6\s*[–-]\s*7/i],
      ["complete Shape", /Require one complete `READY` Shape Report/i],
      ["inline input", /current task context or user input/i],
      ["artifact reference input", /Local Work Memory Artifact reference/i],
      ["MCP resolution", /Local Work Memory MCP/i],
      ["no persistence gate", /Do not require a persistence result/i],
      ["direct execution", /passed directly to `?\$workbench:execute-task`?/i],
      ["dependency DAG", /dependency DAG/i],
      ["one worktree per task", /Every implementation and integration Task Packet gets one unique path/i],
      ["no coordinator", /Do not reserve or reuse a coordinator worktree/i],
      ["no materialization", /worktrees_materialized: false/],
    ],
    "prepare",
  );
  assert.doesNotMatch(text, /Shape Wiki|Prepare Wiki|not executable until|must be persisted/i);
});

test("Prepare freezes task-scoped execution independently of storage", () => {
  const contract = referenceDocument("prepare");
  const plan = markdownSection(contract, "## Required Execution Plan", "## Required Task Packet");

  for (const field of [
    "shape_input:",
    "kind: inline | memory_artifact",
    "artifact_ref: null",
    "execution_plan_digest:",
    "worktree_policy: task_scoped",
    "topology: serial_task_worktrees | parallel_task_worktrees",
    "planned_worktree_count:",
    "worktrees_materialized: false",
    "task_worktree_reuse_policy: none",
    "baseline_failures:",
  ]) {
    assert.ok(plan.includes(field), `Execution Plan must include ${field}`);
  }

  assert.match(contract, /There is no coordinator worktree/i);
  assert.match(contract, /Every plan includes a final integration-seal packet/i);
  assert.match(contract, /complete `READY` Execution Plan and Task Packet are immediately valid inputs/i);
  assert.match(contract, /Memory Update is optional/i);
  assert.match(contract, /same-task partial diff may be adopted only/i);
});

test("Execute Task accepts inline or referenced plans without persistence", () => {
  const text = skillBundle("execute-task");
  assertContract(
    text,
    [
      ["stage 8", /stage\s+8/i],
      ["complete plan", /one complete `READY` Execution Plan/i],
      ["inline plan", /current task context or user input/i],
      ["artifact reference", /Local Work Memory Artifact reference/i],
      ["no persistence gate", /Do not require Shape or Prepare to have been persisted/i],
      ["task-scoped worktree", /task-scoped standard Git worktree/i],
      ["Local checkout prohibition", /never modify there/i],
      ["worktree materialization", /git worktree add -b/],
      ["task planning", /Plan and fact preflight/i],
      ["test", /\*\*Test:\*\*/],
      ["implementation", /\*\*Implement:\*\*/],
      ["verification", /\*\*Verify:\*\*/],
      ["self-review", /\*\*Self-review:\*\*/],
      ["task-local commit", /task-local commit/i],
      ["quarantine", /quarantined evidence/i],
    ],
    "execute-task",
  );
  assert.doesNotMatch(text, /successful Shape and Prepare Memory Update Results|source_id values/);
});

test("Execute Task binds plan, packet, source mode, and dependency heads", () => {
  const contract = referenceDocument("execute-task");
  assert.match(contract, /exactly one corresponding digest field/i);
  assert.match(contract, /Replace only the relevant digest scalar value with the empty string/i);
  assert.match(contract, /RFC 8785 JSON Canonicalization Scheme/i);
  assert.match(contract, /git worktree list --porcelain/i);
  assert.match(contract, /integration_allowed: false when not COMPLETE/i);

  const result = markdownSection(contract, "## Task Result");
  for (const field of [
    "plan_input_kind: inline | memory_artifact",
    "plan_artifact_ref:",
    "execution_plan_digest:",
    "task_packet_digest:",
    "worktree_created: true | false",
    "execution_binding_digest:",
    "integrated_head_sha:",
  ]) {
    assert.ok(result.includes(field), `Task Result must include ${field}`);
  }
});

test("Finalize accepts inline or referenced workflow results and closes validation gaps", () => {
  const text = skillBundle("finalize");
  assertContract(
    text,
    [
      ["stages 9-11", /stages?\s+9\s*[–-]\s*11/i],
      ["integrated head", /integrated_head_sha/],
      ["inline inputs", /current context or user input/i],
      ["artifact references", /Local Work Memory Artifact references/i],
      ["MCP resolution", /Local Work Memory MCP/i],
      ["no persistence gate", /Do not require any workflow result to have been persisted/i],
      ["failure validation", /failure/i],
      ["concurrency validation", /concurren/i],
      ["load validation", /\bload\b/i],
      ["independent review", /independent review/i],
      ["required-check gate", /required or acceptance-critical unperformed check blocks `FINALIZED`/i],
      ["final clean state", /Recheck the final branch, HEAD, diff, and clean status/i],
    ],
    "finalize",
  );

  const contract = referenceDocument("finalize");
  assert.match(contract, /## Input artifacts/);
  assert.match(contract, /task packet and Execution Binding digests/i);
  assert.match(contract, /required unverified check/i);
  assert.match(contract, /task-worktree cleanup not performed/);
  assert.doesNotMatch(contract, /## Dev Wiki artifacts/);
});
