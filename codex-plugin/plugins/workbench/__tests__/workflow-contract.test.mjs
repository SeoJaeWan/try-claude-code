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
  assert.match(
    skill,
    new RegExp(`\\[references/${referenceFiles[name].replaceAll(".", "\\.")}\\]\\(references/${referenceFiles[name].replaceAll(".", "\\.")}\\)`),
    `${name} must link its tested reference directly`,
  );
  return `${skill}\n\n${reference}`;
}

function markdownSection(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const end = nextHeading === undefined ? text.length : text.indexOf(nextHeading, start + heading.length);
  assert.notEqual(end, -1, `missing section boundary ${nextHeading}`);
  return text.slice(start, end);
}

function assertContract(text, checks, skill) {
  for (const [label, pattern] of checks) {
    assert.match(text, pattern, `${skill} must define ${label}`);
  }
}

function markdownTableRows(text, heading, nextHeading) {
  return markdownSection(text, heading, nextHeading)
    .split("\n")
    .filter((line) => /^\|.*\|$/.test(line))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((row) => row.length === 2 && row[0] !== "Service evidence" && row[0] !== "---");
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

test("Shape performs stages 0-4 read-only in Local or a linked checkout", () => {
  const text = skillBundle("shape");
  assertContract(
    text,
    [
      ["stages 0-4", /stages?\s+0\s*[–-]\s*4/i],
      ["Local Work Memory search", /memory_search/],
      ["canonical memory snapshots", /memory_get/],
      ["Context7 research", /Context7/i],
      ["Jira evidence", /Jira[\s\S]{0,180}(?:issue|project)/i],
      ["Figma evidence", /Figma[\s\S]{0,180}(?:node|design)/i],
      ["fact labeling", /Fact \/ repository-fact/],
      ["inference labeling", /Inference/],
      ["decision labeling", /Decision/],
      ["assumption labeling", /Assumption/],
      ["primary Local support", /primary Local is a valid read-only Shape environment/i],
      ["linked checkout support", /linked worktree/i],
      ["task-scoped execution policy", /execution_worktree_policy: task_scoped/],
      ["Dev Wiki artifact", /Dev Wiki Artifact Change Set/],
      ["memory write prohibition", /Do NOT[\s\S]{0,100}(?:call )?`memory_write`/i],
      ["implementation prohibition", /Do NOT modify repository code or implement application code/i],
    ],
    "shape",
  );

  assert.match(text, /does not require or create a worktree/i);
  assert.match(text, /Do not create a Codex task/i);
  assert.match(text, /do not.*run `git worktree add` during Shape/i);
  assert.doesNotMatch(text, /Call `create_thread`|Call the Codex app's `list_projects`/i);
});

test("Shape renders the durable decision record and Korean report contract", () => {
  const skill = skillDocument("shape");
  const contract = referenceDocument("shape");
  const report = markdownSection(
    contract,
    "## Required report sections",
    "## Canonical Shape artifact body",
  );

  assert.match(skill, /human-facing headings and prose labels in the user's primary language/i);
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
    "## Dev Wiki Shape artifact",
    "## Dev Wiki Artifact Change Set",
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
    "work_item_key:",
    "analysis_worktree_required: false",
    "execution_worktree_policy: task_scoped",
    "status_fingerprint:",
    "decision_status: proposed | accepted | superseded",
    "근거와 작업 이유",
    "무효화 조건",
  ]) {
    assert.ok(report.includes(field), `Shape report must preserve ${field}`);
  }
});

test("Shape fixes content-sensitive identity and one canonical Wiki artifact", () => {
  const contract = referenceDocument("shape");
  assertContract(
    contract,
    [
      ["revisioned Shape identity", /shape_report_id`? to `<run_id>\/shape\/<positive revision number>`/i],
      ["repository identity", /Set `repository_id` to the SHA-256/i],
      ["porcelain status bytes", /git status --porcelain=v1 -z --untracked-files=all/],
      ["raw byte capture", /Capture raw stdout bytes without newline normalization/i],
      ["staged and unstaged content", /`staged_diff`:[\s\S]{0,250}`unstaged_diff`:/i],
      ["untracked content hashes", /For a regular file use the SHA-256 of its raw content/i],
      ["symlink target hashing", /For a symlink use the SHA-256 of its raw link-target bytes without following it/i],
      ["versioned fingerprint domain", /workbench-status-fingerprint`?, NUL, ASCII `v1/i],
      ["length framing", /unsigned 64-bit big-endian byte length/i],
      ["fingerprint version mismatch", /algorithm-version mismatch returns `RESHAPE_REQUIRED`/i],
      ["incomplete fingerprint blocking", /fingerprint `incomplete` and block Prepare readiness/i],
      ["one artifact mutation", /proposes exactly one entry/i],
      ["stable shape slug", /work-items\/<stable-work-item-key>\/shape/],
      ["full body digest", /SHA-256 the exact UTF-8 bytes/i],
      ["self-reference prevention", /Do not include `artifact_digest` inside `full_body`/i],
      ["full replacement", /complete replacement body, never a patch/i],
      ["secret handling", /credentials, tokens, private keys/i],
      ["persistence gate", /not Prepare-ready until `\$workbench:memory-update`/i],
      ["unchanged persistence acceptance", /`APPLIED`\/`indexed` or `NOT_NEEDED`\/`unchanged`/i],
    ],
    "shape report",
  );
});

test("Memory Update persists exactly one guarded Shape or Prepare artifact", () => {
  const text = skillBundle("memory-update");
  assertContract(
    text,
    [
      ["Shape and Prepare input", /artifact_kind: shape \| prepare/],
      ["single artifact", /Accept only one entry/i],
      ["Dev Wiki only", /Accept only `source_type: dev_wiki`/i],
      ["full-body digest", /artifact_digest/],
      ["expected revision", /expected_revision/],
      ["create mapping", /create -> memory_write/],
      ["update mapping", /update -> memory_write/],
      ["skip no-op", /skip\s+-> no tool call/],
      ["supported completion statuses", /supported completion statuses = \{200, 201\}/],
      ["indexed success with identity", /supported status AND outcome indexed AND non-empty returned source_id/],
      ["HTTP class is insufficient", /HTTP-success class alone does not prove/i],
      ["Shape conflict", /Shape: `RESHAPE_REQUIRED`/i],
      ["Prepare conflict", /Prepare: `REPREPARE_REQUIRED`/i],
      ["unknown result safety", /INDETERMINATE/],
      ["no automatic retry", /Never (?:automatically )?retry/i],
      ["canonical handoff", /dev_wiki_ref/],
      ["two valid persisted states", /`APPLIED`\/`indexed` and `NOT_NEEDED`\/`unchanged`/i],
    ],
    "memory-update",
  );

  const skill = skillDocument("memory-update");
  assert.match(skill, /Do not run `memory_search`, `memory_get`, `memory_graph`/i);
  assert.match(skill, /Do NOT modify repository files/i);
});

test("Memory Update distinguishes completed writes from other HTTP-success responses", () => {
  const rows = new Map(
    markdownTableRows(
      referenceDocument("memory-update"),
      "Use this result matrix:",
      "## Dev Wiki reference",
    ),
  );

  assert.equal(
    rows.get("`200/indexed` with a non-empty returned `source_id`"),
    "`APPLIED`/`indexed`",
  );
  assert.equal(
    rows.get("`201/indexed` with a non-empty returned `source_id`"),
    "`APPLIED`/`indexed`",
  );
  assert.equal(rows.get("`202/indexed`"), "`INDETERMINATE`");
  assert.equal(
    rows.get("`200` or `201` with `outcome != indexed` (for example, `201/completed`)"),
    "`INDETERMINATE`",
  );
  assert.equal(
    rows.get("Missing or untrustworthy `status`, `outcome`, or returned `source_id`"),
    "`INDETERMINATE`",
  );
  assert.equal(
    rows.get("`409`"),
    "Shape: `RESHAPE_REQUIRED`; Prepare: `REPREPARE_REQUIRED`",
  );
  assert.equal(
    rows.get("Timeout, disconnect, or transport exception"),
    "`INDETERMINATE`",
  );
  assert.equal(
    rows.get("Trustworthy determinate non-409 `4xx` or `5xx`"),
    "`FAILED`",
  );
  assert.equal(rows.size, 8, "memory-update result matrix must stay explicit and complete");
});

test("Prepare verifies persisted Shape and plans one worktree per task", () => {
  const text = skillBundle("prepare");
  assertContract(
    text,
    [
      ["stages 6-7", /stages?\s+6\s*[–-]\s*7/i],
      ["persisted Shape gate", /Memory Update Result with `status: APPLIED` or `NOT_NEEDED`/i],
      ["canonical Shape reread", /Use `memory_get`/i],
      ["Execution Plan", /Execution Plan/],
      ["baseline validation", /baseline/i],
      ["dependency DAG", /dependency DAG/i],
      ["task-scoped policy", /worktree_policy: task_scoped/],
      ["one path and branch per task", /Every implementation and integration Task Packet gets one unique path/i],
      ["no coordinator reuse", /Do not reserve or reuse a coordinator worktree/i],
      ["no materialization", /worktrees_materialized: false/],
      ["base commit", /base_commit/],
      ["owned paths", /owned_paths/],
      ["integration order", /integration_order/],
      ["Prepare Wiki artifact", /Dev Wiki Prepare artifact/i],
      ["persistence before execution", /not executable until an explicit `\$workbench:memory-update`/i],
    ],
    "prepare",
  );
  assert.match(text, /Do NOT implement tasks, create or delete worktrees/i);
});

test("Prepare freezes symbolic waves, unique branches, final sealing, and Wiki persistence", () => {
  const contract = referenceDocument("prepare");
  const plan = markdownSection(contract, "## Required Execution Plan", "## Required Task Packet");

  for (const field of [
    "shape_artifact_digest:",
    "repository_id:",
    "work_item_key:",
    "shape_wiki_ref:",
    "execution_plan_digest:",
    "worktree_policy: task_scoped",
    "topology: serial_task_worktrees | parallel_task_worktrees",
    "planned_worktree_count:",
    "worktrees_materialized: false",
    "task_worktree_reuse_policy: none",
    "shape_wiki_state: applied | unchanged",
    "prepare_wiki_state: proposed",
    "baseline_failures:",
  ]) {
    assert.ok(plan.includes(field), `Execution Plan must include ${field}`);
  }

  assert.match(contract, /There is no coordinator worktree/i);
  assert.match(contract, /Every implementation and integration packet uses a unique task-scoped branch/i);
  assert.match(contract, /For the first task or wave, use `kind: exact_sha` with `base_commit`/i);
  assert.match(contract, /For a later serial task, use `kind: task_output`/i);
  assert.match(contract, /For a wave after integration, use `kind: integration_output`/i);
  assert.match(contract, /Every plan includes a final integration-seal packet/i);
  assert.match(contract, /proposes exactly one change/i);
  assert.match(contract, /work-items\/<stable-work-item-key>\/prepare/);
  assert.match(contract, /ready plan is not executable until `\$workbench:memory-update`/i);
  assert.match(contract, /`APPLIED`\/`indexed` or `NOT_NEEDED`\/`unchanged`/i);
  assert.match(contract, /same-task partial diff may be adopted only when a new packet names `resume_from_result_id`/i);

  const blocked = markdownSection(contract, "## Blocked result");
  for (const field of [
    "plan_status: BLOCKED | RESHAPE_REQUIRED",
    "task_packets_emitted: false",
    "dev_wiki_artifact_state: blocked",
  ]) {
    assert.ok(blocked.includes(field), `blocked plan must include ${field}`);
  }
});

test("Execute Task materializes and executes exactly one persisted task worktree", () => {
  const text = skillBundle("execute-task");
  assertContract(
    text,
    [
      ["stage 8", /stage\s+8/i],
      ["Shape and Prepare persistence gate", /successful Shape and Prepare Memory Update Results/i],
      ["canonical Prepare reread", /Use `memory_get` on both exact source IDs/i],
      ["canonical Shape reread", /memory_get` on both exact source IDs/i],
      ["Shape digest binding", /shape_artifact_digest/],
      ["Prepare digest binding", /prepare_artifact_digest/],
      ["task-scoped worktree", /task-scoped standard Git worktree/i],
      ["Local checkout prohibition", /never modify there/i],
      ["worktree materialization", /git worktree add -b/],
      ["exact path and branch validation", /canonical assigned path[\s\S]{0,500}planned branch/i],
      ["task planning", /Plan and fact preflight/i],
      ["test", /\*\*Test:\*\*/],
      ["implementation", /\*\*Implement:\*\*/],
      ["verification", /\*\*Verify:\*\*/],
      ["self-review", /\*\*Self-review:\*\*/],
      ["task-local commit", /task-local commit/i],
      ["integration worktree", /integration task has its own unique worktree/i],
      ["invalidated quarantine", /quarantined evidence/i],
      ["explicit same-task dirty resume", /resume_from_result_id[\s\S]{0,350}user explicitly approves/i],
    ],
    "execute-task",
  );
});

test("Execute Task binds immutable plan, packet, Wiki artifact, and dependency heads", () => {
  const contract = referenceDocument("execute-task");
  assert.match(contract, /exactly one corresponding digest field/i);
  assert.match(contract, /Replace only the relevant digest scalar value with the empty string/i);
  assert.match(contract, /exclude no lines and trim no whitespace/i);
  assert.match(
    contract,
    /"execution_plan_digest"[\s\S]{0,300}"task_packet_digest"[\s\S]{0,300}"shape_artifact_digest"[\s\S]{0,300}"prepare_artifact_digest"[\s\S]{0,300}"resolved_base_sha"/i,
  );
  assert.match(contract, /RFC 8785 JSON Canonicalization Scheme/i);
  assert.match(contract, /git worktree list --porcelain/i);
  assert.match(contract, /Retrieve both exact `source_id` values with `memory_get`/i);
  assert.match(contract, /integration_allowed: false when not COMPLETE/i);

  const taskResult = markdownSection(contract, "## Task Result");
  for (const field of [
    "shape_artifact_digest:",
    "shape_wiki_source_id:",
    "prepare_artifact_digest:",
    "prepare_wiki_source_id:",
    "worktree_created: true | false",
    "execution_binding_digest:",
    "integrated_head_sha:",
  ]) {
    assert.ok(taskResult.includes(field), `Task Result must include ${field}`);
  }
});

test("Finalize validates the final integration task worktree and preserves Wiki provenance", () => {
  const text = skillBundle("finalize");
  assertContract(
    text,
    [
      ["stages 9-11", /stages?\s+9\s*[–-]\s*11/i],
      ["integrated head", /integrated_head_sha/],
      ["final integration worktree", /final integration task's[\s\S]{0,80}worktree/i],
      ["Shape Wiki reference", /Shape Dev Wiki reference/i],
      ["Prepare Wiki reference", /Prepare Dev Wiki reference/i],
      ["failure validation", /failure/i],
      ["concurrency validation", /concurren/i],
      ["load validation", /\bload\b/i],
      ["independent review", /independent review/i],
      ["unperformed checks", /unperformed_checks|unperformed checks/i],
      ["canonical base commit", /base_commit/],
    ],
    "finalize",
  );
  assert.doesNotMatch(referenceDocument("finalize"), /base_snapshot|base_sha:/);
  assert.doesNotMatch(text, /recorded linked coordinator worktree/i);

  const contract = referenceDocument("finalize");
  const gate = markdownSection(contract, "## Entry-gate failure", "## Final report");
  assert.match(gate, /status: INTEGRATION_REQUIRED \| BLOCKED/);
  assert.match(gate, /integrated_head_sha: unavailable/);
  assert.match(gate, /do not fabricate the full report/i);
  assert.match(contract, /## Dev Wiki artifacts/);
  assert.match(contract, /task-worktree cleanup not performed/);
});
