import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");
}

function fencedYamlAfter(text, heading) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const match = text.slice(start).match(/```yaml\n([\s\S]*?)\n```/);
  assert.notEqual(match, null, `missing YAML contract after ${heading}`);
  return match[1];
}

test("Prepare keeps the immutable plan canonical and appends a derived reader walkthrough", () => {
  const skill = read("skills/prepare/SKILL.md");
  const contract = read("skills/prepare/references/execution-plan.md");

  assert.match(skill, /append a concise human-readable walkthrough/i);
  assert.match(contract, /always append `## 작업 단계 설명` for a Korean response or an equivalent heading/i);
  assert.match(contract, /not part of the immutable plan or any plan or packet digest/i);
  assert.match(contract, /derive every statement from the emitted plan/i);
});

test("Execute Task accepts the Prepare packet semantically and normalizes a strict worker binding", () => {
  const prepare = read("skills/prepare/references/execution-plan.md");
  const executeSkill = read("skills/execute-task/SKILL.md");
  const execute = read("skills/execute-task/references/task-execution.md");
  const preparePlan = fencedYamlAfter(prepare, "## Required plan");
  const preparePacket = fencedYamlAfter(prepare, "## Required task packet");
  const runtimePacket = fencedYamlAfter(execute, "## Minimum normalized runtime packet");

  assert.match(preparePlan, /^repository_id:/m);
  assert.match(preparePlan, /^git_common_dir:/m);
  assert.match(preparePacket, /^acceptance_contract:/m);

  assert.match(executeSkill, /Do not require a particular producer or exact source field vocabulary/i);
  assert.match(execute, /plan-level repository identity inherited by tasks/i);
  assert.match(execute, /`acceptance_contract` used as observable acceptance conditions/i);
  assert.match(execute, /Inherit `repository_id`, `git_common_dir`/i);

  for (const field of [
    "repository_id",
    "git_common_dir",
    "requirements",
    "acceptance_conditions",
    "invariants",
    "decisions",
    "task_packet_digest",
    "execution_binding_digest",
  ]) {
    assert.match(runtimePacket, new RegExp(`^${field}:`, "m"), `runtime packet must bind ${field}`);
  }
});
