import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = path.join(pluginRoot, "skills");
const activeSkills = ["execute-task", "memory-update", "prepare", "shape"];

function read(relativePath) {
  return fs.readFileSync(path.join(pluginRoot, relativePath), "utf8");
}

function yamlTemplateWith(text, key) {
  const blocks = [...text.matchAll(/```yaml\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const matches = blocks.filter((block) => block.split("\n").some((line) => line.startsWith(`${key}:`)));
  assert.equal(matches.length, 1, `expected one template containing ${key}`);
  return matches[0];
}

test("the plugin exposes only the four complete explicit skills", () => {
  const manifest = JSON.parse(read(".codex-plugin/plugin.json"));
  assert.equal(path.resolve(pluginRoot, manifest.skills), skillRoot);
  const actual = fs.readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(actual, activeSkills);

  for (const name of activeSkills) {
    const skill = read(`skills/${name}/SKILL.md`);
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${name} needs frontmatter`);
    assert.match(frontmatter[1], new RegExp(`^name: ${name}$`, "m"));
    const metadata = read(`skills/${name}/agents/openai.yaml`);
    assert.match(metadata, /^  allow_implicit_invocation: false$/m);
    assert.ok(metadata.includes(`$workbench:${name}`));
  }
  for (const prompt of manifest.interface.defaultPrompt) {
    const name = prompt.match(/\$workbench:([a-z-]+)/)?.[1];
    assert.ok(activeSkills.includes(name), `undiscoverable prompt target: ${prompt}`);
  }
});

test("skill resources are reachable and stay inside their self-contained skill", () => {
  for (const name of activeSkills) {
    const root = path.join(skillRoot, name);
    const visited = new Set();
    function visit(file) {
      if (visited.has(file)) return;
      visited.add(file);
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
        const target = match[1];
        if (/^https?:/.test(target)) continue;
        const resolved = path.resolve(path.dirname(file), target);
        assert.ok(resolved.startsWith(`${root}${path.sep}`), `${name} escapes its skill: ${target}`);
        assert.ok(fs.statSync(resolved).isFile(), `missing resource: ${resolved}`);
        visit(resolved);
      }
    }
    visit(path.join(root, "SKILL.md"));
    const refs = path.join(root, "references");
    for (const entry of fs.readdirSync(refs)) {
      if (entry.endsWith(".md")) assert.ok(visited.has(path.join(refs, entry)), `unreachable reference: ${name}/${entry}`);
    }
  }
});

test("plan and execution packet templates carry dispatch and identity fields", () => {
  const prepare = read("skills/prepare/references/execution-plan.md");
  const execute = read("skills/execute-task/references/task-execution.md");
  const plan = yamlTemplateWith(prepare, "planned_worktree_count");
  const packet = yamlTemplateWith(prepare, "task_id");
  const runtime = yamlTemplateWith(execute, "task_id");
  for (const field of ["repository_id", "git_common_dir", "base_commit"]) {
    assert.match(plan, new RegExp(`^${field}:`, "m"));
  }
  for (const body of [packet, runtime]) {
    for (const field of ["task_id", "execution_profile", "depends_on", "owned_paths", "forbidden_paths", "commit_policy", "task_packet_digest"]) {
      assert.match(body, new RegExp(`^${field}:`, "m"));
    }
    for (const field of ["model", "reasoning_effort", "rationale", "escalation"]) {
      assert.match(body, new RegExp(`^  ${field}:`, "m"));
    }
  }
  for (const field of ["repository_id", "git_common_dir", "requirements", "acceptance_conditions", "invariants", "decisions", "execution_binding_digest", "intent_revision", "resume_state"]) {
    assert.match(runtime, new RegExp(`^${field}:`, "m"));
  }
});
