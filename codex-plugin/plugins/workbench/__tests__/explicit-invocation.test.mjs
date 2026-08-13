import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseOpenaiMetadata } from "./test-helpers.mjs";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(pluginRoot, "skills");
const expectedSkills = [
  "execute-task",
  "finalize",
  "memory-update",
  "prepare",
  "shape",
];

function skillDirectories() {
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
    .sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function frontmatter(text, skill) {
  const match = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  assert.notEqual(match, null, `${skill} must start with closed YAML frontmatter`);
  return match[1];
}

function scalarField(yaml, field, skill) {
  const match = yaml.match(new RegExp(`^${escapeRegExp(field)}:[ \\t]*(.+?)[ \\t]*$`, "m"));
  assert.notEqual(match, null, `${skill} frontmatter must declare ${field}`);
  return match[1].replace(/^["']|["']$/g, "").trim();
}

test("exposes exactly the five independent Workbench skills", () => {
  assert.deepEqual(skillDirectories(), expectedSkills);
});

test("every Workbench skill requires its own explicit namespaced selector", () => {
  for (const skill of expectedSkills) {
    const skillFile = path.join(skillsRoot, skill, "SKILL.md");
    const metadataFile = path.join(skillsRoot, skill, "agents", "openai.yaml");
    assert.equal(fs.existsSync(metadataFile), true, `${skill} must provide agents/openai.yaml`);

    const skillText = fs.readFileSync(skillFile, "utf8");
    const metadataText = fs.readFileSync(metadataFile, "utf8");
    const metadata = parseOpenaiMetadata(metadataText, `${skill}/agents/openai.yaml`);
    const metadataFrontmatter = frontmatter(skillText, skill);
    const selector = `$workbench:${skill}`;

    assert.equal(scalarField(metadataFrontmatter, "name", skill), skill);
    assert.match(
      scalarField(metadataFrontmatter, "description", skill),
      new RegExp(escapeRegExp(selector)),
      `${skill} description must name its explicit selector`,
    );
    assert.doesNotMatch(skillText, /\[TODO:/, `${skill} must not retain scaffold TODOs`);
    assert.match(metadata.interface?.default_prompt ?? "", new RegExp(escapeRegExp(selector)));
    assert.equal(
      metadata.policy?.allow_implicit_invocation,
      false,
      `${skill} must disable implicit invocation`,
    );
    assert.doesNotMatch(
      metadataText,
      new RegExp(`\\$${escapeRegExp(skill)}(?![A-Za-z0-9:-])`),
      `${skill} must not advertise an unnamespaced selector`,
    );

    const advertisedSkills = [
      ...(metadata.interface.default_prompt ?? "").matchAll(/\$workbench:([a-z0-9-]+)/g),
    ].map((match) => match[1]);
    assert.deepEqual(
      [...new Set(advertisedSkills)],
      [skill],
      `${skill} default metadata must not chain to another Workbench skill`,
    );
  }
});
