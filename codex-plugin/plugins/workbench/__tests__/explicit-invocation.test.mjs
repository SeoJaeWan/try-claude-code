import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");

function skillDirectories() {
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("every Workbench skill requires an explicit namespaced invocation", () => {
  const skills = skillDirectories();
  assert.deepEqual(skills, [
    "brainstorm",
    "dev-wiki",
    "executor",
    "issue-brief",
    "llm-script",
    "openapi",
    "visual-grounding"
  ]);

  for (const skill of skills) {
    const skillFile = path.join(skillsRoot, skill, "SKILL.md");
    const metadataFile = path.join(skillsRoot, skill, "agents", "openai.yaml");
    assert.equal(fs.existsSync(metadataFile), true, `${skill} must provide agents/openai.yaml`);

    const skillText = fs.readFileSync(skillFile, "utf8");
    const metadataText = fs.readFileSync(metadataFile, "utf8");
    const selector = `$workbench:${skill}`;
    const escapedSelector = escapeRegExp(selector);

    assert.match(skillText, new RegExp(`^description:.*${escapedSelector}`, "m"));
    assert.match(metadataText, new RegExp(`default_prompt:.*${escapedSelector}`));
    assert.match(metadataText, /policy:\s*\n\s+allow_implicit_invocation:\s*false\b/);
    assert.doesNotMatch(metadataText, new RegExp(`\\$${skill}(?![A-Za-z0-9:-])`));
  }
});

test("executor keeps persistent verification artifacts inside the agreed goal", () => {
  const executorText = fs.readFileSync(path.join(skillsRoot, "executor", "SKILL.md"), "utf8");

  assert.doesNotMatch(executorText, /\$workbench:test-brief|Test Brief/);
  assert.match(executorText, /Do not create or retain new project artifacts solely to strengthen verification/);
  assert.match(executorText, /existing focused regression or contract tests/);
});

test("dev-wiki treats an unqualified refresh as a whole-bundle operation", () => {
  const devWikiRoot = path.join(skillsRoot, "dev-wiki");
  const skillText = fs.readFileSync(path.join(devWikiRoot, "SKILL.md"), "utf8");
  const syncPolicyText = fs.readFileSync(
    path.join(devWikiRoot, "references", "sync-policy.md"),
    "utf8"
  );

  assert.match(skillText, /Treat an unqualified reference to Dev Wiki itself as this whole bundle/);
  assert.match(skillText, /"Dev Wiki 최신화해줘" means refresh the whole source bundle/);
  assert.match(skillText, /Do not gate whole-bundle refresh on the current workspace mapping/);
  assert.match(syncPolicyText, /Do not read or require `workspaces\.json`.*whole-bundle refresh/);
});
