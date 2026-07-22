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
    "test-brief",
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
