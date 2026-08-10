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

function skillDocument(name) {
  return fs.readFileSync(path.join(skillsRoot, name, "SKILL.md"), "utf8");
}

function referenceDocument(name) {
  return fs.readFileSync(
    path.join(skillsRoot, name, "references", referenceFiles[name]),
    "utf8",
  );
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

test("all workflow stages remain independently and explicitly invoked", () => {
  for (const skill of ["shape", "memory-update", "prepare", "execute-task", "finalize"]) {
    assert.match(
      skillDocument(skill),
      /^Do NOT automatically invoke another Workbench skill\.$/m,
      `${skill} must prohibit automatic Workbench chaining`,
    );
  }
});

test("Shape owns stages 0-4 and produces an evidence-backed read-only contract", () => {
  const text = skillBundle("shape");
  assertContract(
    text,
    [
      ["stages 0-4", /stages?\s+0\s*[–-]\s*4|0\s*[–-]\s*4\s*단계/i],
      ["Local Work Memory search", /memory_search/],
      ["canonical memory snapshots", /memory_get/],
      ["Context7 research", /Context7/i],
      ["Jira evidence retrieval", /Jira[\s\S]{0,180}(?:issue|project)[\s\S]{0,180}(?:read|retrieve)/i],
      ["Figma evidence retrieval", /Figma[\s\S]{0,180}(?:node|design)[\s\S]{0,180}(?:inspect|read|retrieve)/i],
      ["official source verification", /official (?:documentation|docs|sources?)|공식 문서/i],
      ["Markdown output", /Markdown/i],
      [
        "source links",
        /clickable[\s\S]{0,80}(?:links?|sources?)|(?:Sources?|출처)[\s\S]{0,120}(?:links?|URLs?|https?:|링크)/i,
      ],
      ["fact labeling", /\bFact\b/],
      ["inference labeling", /\bInference\b/],
      ["decision labeling", /\bDecision\b/],
      ["assumption labeling", /\bAssumption\b/],
      ["Memory Change Set", /Memory Change Set/],
      ["revision snapshot", /source_revision/],
      ["coordinator worktree", /coordinator worktree/i],
      ["local checkout isolation", /local checkout/i],
      [
        "memory-write prohibition",
        /Do NOT[\s\S]{0,120}(?:call|use|invoke)[\s\S]{0,60}`?memory_write`?/i,
      ],
      [
        "implementation prohibition",
        /Do NOT[\s\S]{0,140}(?:implement|edit|modify)[\s\S]{0,80}(?:application|code|repository)/i,
      ],
      [
        "Jira and Figma mutation prohibition",
        /Shape is read-only toward Jira and Figma[\s\S]{0,240}Do NOT[\s\S]{0,160}(?:create|edit)[\s\S]{0,180}(?:issues|comments|transitions)[\s\S]{0,220}(?:files|nodes|variables|components|designs)/i,
      ],
    ],
    "shape",
  );
});

test("Memory Update applies only a prepared revision-guarded change set", () => {
  const text = skillBundle("memory-update");
  assertContract(
    text,
    [
      ["stage 5", /stage\s+5|5\s*단계/i],
      ["Memory Change Set input", /Memory Change Set/],
      ["Local Work Memory mutation", /memory_write/],
      ["default dev wiki target", /dev_wiki/],
      ["expected revision", /expected_revision/],
      [
        "full-body replacement",
        /full[ -](?:document )?body|entire (?:document )?body|whole (?:document )?body|replace[\s\S]{0,80}(?:document )?body|전체 본문/i,
      ],
      ["status inspection", /\bstatus\b/],
      ["409 conflict", /\b409\b/],
      ["Shape conflict return", /409[\s\S]{0,240}(?:\$workbench:shape|Shape)/i],
      [
        "research prohibition",
        /Do NOT(?=[\s\S]{0,300}(?:search|research|memory_search|memory_get))(?=[\s\S]{0,300}(?:again|additional|새로|추가))/i,
      ],
      ["merge prohibition", /Do NOT[\s\S]{0,120}(?:merge|resolve)[\s\S]{0,80}(?:409|conflict)/i],
    ],
    "memory-update",
  );
});

test("Prepare turns stages 6-7 into a verified mandatory-worktree execution plan", () => {
  const text = skillBundle("prepare");
  assertContract(
    text,
    [
      ["stages 6-7", /stages?\s+6\s*[–-]\s*7|6\s*[–-]\s*7\s*단계/i],
      ["Execution Plan", /Execution Plan/],
      ["baseline verification", /baseline/i],
      ["dependency DAG", /(?:dependency|task)[\s-]*DAG/i],
      ["mandatory worktrees", /worktree[\s\S]{0,100}(?:required|mandatory|invariant|must)/i],
      ["coordinator worktree", /coordinator worktree/i],
      ["worker worktrees", /worker worktree/i],
      ["single-or-parallel topology", /single[\s\S]{0,100}parallel|parallel[\s\S]{0,100}single/i],
      ["base commit", /base_commit/],
      ["parallel group", /parallel_group/],
      ["owned paths", /owned_paths/],
      ["integration order", /integration_order/],
      ["verification commands", /(?:verification|focused)_?(?:commands|checks)/i],
    ],
    "prepare",
  );
});

test("Execute Task runs the complete task loop only in its assigned worktree", () => {
  const text = skillBundle("execute-task");
  assertContract(
    text,
    [
      ["stage 8", /stage\s+8|8\s*단계/i],
      ["Execution Plan input", /Execution Plan/],
      ["assigned worktree", /assigned worktree/i],
      ["local checkout prohibition", /Do NOT[\s\S]{0,120}(?:edit|modify|implement)[\s\S]{0,80}local checkout/i],
      ["task planning", /\bPlan\b/],
      ["test or acceptance criteria", /\bTest\b|Acceptance Criteria/],
      ["implementation", /\bImplement\b/],
      ["verification", /\bVerif(?:y|ication)\b/],
      ["self-review", /Self[ -]review/i],
      ["task-local commit", /task[ -]local commit|\bCommit\b/],
      ["owned path enforcement", /owned_paths/],
      ["task head SHA", /head_sha|commit SHA/i],
      ["integration task", /kind:\s*integration|Integration Task/i],
      ["integration through Execute Task", /integration[\s\S]{0,180}(?:same skill|execute-task|Execute Task)/i],
    ],
    "execute-task",
  );
});

test("Finalize validates and documents only the integrated stages 9-11 result", () => {
  const text = skillBundle("finalize");
  assertContract(
    text,
    [
      ["stages 9-11", /stages?\s+9\s*[–-]\s*11|9\s*[–-]\s*11\s*단계/i],
      ["integrated head", /integrated_head_sha|integrated head/i],
      ["coordinator worktree", /coordinator worktree/i],
      ["concurrency verification", /concurren(?:cy|t)/i],
      ["load verification", /\bload\b/i],
      ["failure verification", /failure/i],
      ["independent review", /independent (?:code )?review/i],
      ["independent reviewer", /(?:fresh|separate|independent)[\s\S]{0,80}(?:agent|reviewer)/i],
      ["README documentation", /README/],
      ["report documentation", /report\.md|Final Report/i],
      ["known limitations", /Known Limitations/i],
      ["unperformed checks", /(?:unperformed|not run|미수행)[\s\S]{0,100}(?:checks?|tests?|검증)/i],
    ],
    "finalize",
  );
});

test("Shape fixes report identity, content-sensitive drift detection, and secret handling", () => {
  const skill = skillDocument("shape");
  const contract = referenceDocument("shape");

  assert.match(skill, /content-sensitive status fingerprint/i);
  assertContract(
    contract,
    [
      [
        "revisioned shape report identity",
        /shape_report_id`? to `<run_id>\/shape\/<positive revision number>`/i,
      ],
      ["status fingerprint field", /status_fingerprint/],
      ["porcelain status bytes", /git status --porcelain=v1 -z --untracked-files=all/],
      ["staged and unstaged content", /staged and unstaged binary diffs/i],
      ["untracked file content hashes", /path\+SHA-256 for every untracked regular file/i],
      ["symlink target hashing", /Hash symlink targets rather than following them/i],
      ["incomplete fingerprint blocking", /fingerprint `incomplete` and block Prepare readiness/i],
      ["sensitive path replacement", /<sensitive-path:sha256-prefix>/],
      ["secret-content exclusion", /Do not reproduce credentials, tokens, private keys/i],
      [
        "blocked secure handoff instead of corrupt redaction",
        /do not redact[\s\S]{0,180}mark the mutation blocked[\s\S]{0,180}secure handoff/i,
      ],
    ],
    "shape report reference",
  );
});

test("Memory Update fixes skip, selected scope, and top-level status precedence", () => {
  const skill = skillDocument("memory-update");
  const contract = referenceDocument("memory-update");

  assert.match(
    skill,
    /action: skip[\s\S]{0,120}no-op[\s\S]{0,120}never pass it to `memory_write`/i,
  );
  assert.match(
    skill,
    /selected_change_ids[\s\S]{0,160}exactly those entries[\s\S]{0,160}not_selected/i,
  );
  assert.match(skill, /selected dependencies[\s\S]{0,100}selected or already satisfied/i);
  assert.match(
    contract,
    /selected_change_ids[\s\S]{0,140}exactly those IDs[\s\S]{0,140}`depends_on` closure/i,
  );
  assert.match(
    contract,
    /dependency ID[\s\S]{0,160}same Change Set[\s\S]{0,120}cycles[\s\S]{0,160}topological/i,
  );
  assert.match(contract, /## Not selected[\s\S]{0,100}selected_change_ids/i);
  assert.match(
    contract,
    /Status precedence is `RESHAPE_REQUIRED` for every trustworthy 409 response[\s\S]{0,160}`partial_applied: true`/i,
  );
  assert.match(
    contract,
    /determinate non-409 failure is `FAILED` before any success and `PARTIAL` after prior success/i,
  );
  assert.match(
    contract,
    /missing or untrustworthy response[\s\S]{0,180}`status: 200`[\s\S]{0,120}unexpected outcome[\s\S]{0,120}`INDETERMINATE`/i,
  );
  assert.match(contract, /never retry it automatically/i);
});

test("Prepare fixes symbolic waves, branch isolation, final sealing, and baseline failure schema", () => {
  const contract = referenceDocument("prepare");

  assert.match(
    contract,
    /For the first task\/wave[\s\S]{0,160}`kind: exact_sha`[\s\S]{0,100}`base_commit`/i,
  );
  assert.match(
    contract,
    /For a later serial coordinator task[\s\S]{0,160}`kind: task_output`[\s\S]{0,160}`result_sha`/i,
  );
  assert.match(
    contract,
    /For a wave after integration[\s\S]{0,160}`kind: integration_output`[\s\S]{0,160}integration task/i,
  );
  assert.match(
    contract,
    /integration_output[\s\S]{0,180}pointing to the integration task[\s\S]{0,300}immutable Execution Binding/i,
  );
  assert.match(
    contract,
    /Every plan includes a final integration-seal packet[\s\S]{0,180}`coordinator_only`[\s\S]{0,100}`strategy: verify_existing_head`[\s\S]{0,180}`integrated_head_sha`/i,
  );
  assert.match(
    contract,
    /Coordinator and integration packets always use[\s\S]{0,100}`coordinator_branch`[\s\S]{0,140}Only worker packets use task-unique branches/i,
  );
  assert.match(contract, /worker_reuse_policy: none/);
  assert.match(contract, /does not reuse a worker path across tasks or waves/i);

  const planSchema = markdownSection(
    contract,
    "## Required Execution Plan",
    "## Required Task Packet",
  );
  for (const field of [
    "baseline_failures:",
    "failure_id:",
    "command:",
    "test_identity:",
    "normalized_error_fingerprint:",
    "observed_count:",
    "acceptance_critical:",
  ]) {
    assert.match(planSchema, new RegExp(field), `baseline schema must include ${field}`);
  }

  const blockedSchema = markdownSection(contract, "## Blocked result");
  for (const field of [
    "plan_status: BLOCKED | RESHAPE_REQUIRED",
    "run_id:",
    "shape_report_id:",
    "blockers: []",
    "completed_baseline_evidence: []",
    "task_packets_emitted: false",
    "required_next_input_or_action: []",
  ]) {
    assert.ok(blockedSchema.includes(field), `blocked plan schema must include ${field}`);
  }
});

test("Execute Task fixes digest self-blanking, Execution Binding, and invalidated-work quarantine", () => {
  const contract = referenceDocument("execute-task");

  assert.match(
    contract,
    /replace only the `task_packet_digest` scalar value with the empty string[\s\S]{0,260}same procedure with only `execution_plan_digest`[\s\S]{0,120}Exclude no lines or fields/i,
  );
  assert.match(
    contract,
    /every existing assigned worktree[\s\S]{0,220}exact planned branch[\s\S]{0,180}`HEAD` to equal[\s\S]{0,120}`resolved_base_sha`/i,
  );
  assert.match(
    contract,
    /"execution_plan_digest"[\s\S]{0,500}"task_packet_digest"[\s\S]{0,500}"resolved_base_sha"[\s\S]{0,700}"execution_binding_digest": ""/i,
  );
  assert.match(
    contract,
    /RFC 8785 JSON Canonicalization Scheme[\s\S]{0,240}SHA-256[\s\S]{0,100}lowercase-hex/i,
  );
  assert.match(contract, /there are no timestamps or excluded fields/i);
  assert.match(
    contract,
    /Mark the old Shape Report and Execution Plan stale[\s\S]{0,180}downstream tasks\/waves that must not integrate/i,
  );
  assert.match(
    contract,
    /For `RESHAPE_REQUIRED`, `REPREPARE_REQUIRED`, `FAILED`, or `BLOCKED`[\s\S]{0,180}do not stage or commit invalidated work[\s\S]{0,180}quarantined evidence/i,
  );
  assert.match(contract, /integration_allowed: false when not COMPLETE/i);
});

test("Finalize fixes the minimal INTEGRATION_REQUIRED entry-gate schema", () => {
  const skill = skillDocument("finalize");
  const contract = referenceDocument("finalize");
  const gate = markdownSection(contract, "## Entry-gate failure", "## Final report");

  assert.match(skill, /If integration is incomplete, return `INTEGRATION_REQUIRED`/i);
  assert.match(gate, /do not fabricate the full report/i);
  assert.match(gate, /status: INTEGRATION_REQUIRED \| BLOCKED/);
  assert.match(gate, /run_id:/);
  assert.match(gate, /reason:/);
  assert.match(gate, /integrated_head_sha: unavailable/);
  assert.match(gate, /documentation_changes: none/);
  assert.match(gate, /unperformed_checks:/);
  assert.match(gate, /integrated diff validation/);
  assert.match(gate, /failure\/concurrency\/load validation/);
  assert.match(gate, /independent review/);
  assert.match(gate, /required_next_input:/);
  assert.doesNotMatch(gate, /FINALIZED|CHANGES_REQUIRED/);
});
