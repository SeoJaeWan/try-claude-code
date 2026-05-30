import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { generateDevWikiGraph } from "../lib/graph-core.mjs";

function writeFile(root, relPath, content) {
  const filePath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dev-wiki-graph-"));
  writeFile(root, ".codex/dev-wiki/config.json", JSON.stringify({
    repo: "https://github.com/example/dev-wiki.git",
    branch: "main",
    project: "sample"
  }, null, 2));
  fs.mkdirSync(path.join(root, ".codex/dev-wiki/source/sample/graph"), { recursive: true });

  writeFile(root, "package.json", JSON.stringify({ name: "fixture", type: "module" }, null, 2));
  writeFile(root, ".codex/skills/ui-spec/SKILL.md", `---
name: ui-spec
description: Lock visible UI direction before planning.
---

# UI Spec
`);
  writeFile(root, "plugin/develop/hooks/hooks.json", JSON.stringify({
    hooks: {
      UserPromptSubmit: [
        { hooks: [{ type: "command", command: "node ${CLAUDE_PLUGIN_ROOT}/scripts/user-prompt-submit-hook.mjs" }] }
      ]
    }
  }, null, 2));
  writeFile(root, "plugin/develop/scripts/lib/runner-state.mjs", `export function saveState(file, state) {
  return JSON.stringify({ file, state });
}
`);
  writeFile(root, "plugin/develop/scripts/user-prompt-submit-hook.mjs", `import { saveState } from "./lib/runner-state.mjs";

export function runHook(input) {
  return saveState("state.json", input);
}
`);
  writeFile(root, "plugin/develop/skills/dev-review/assets/vendor/diff2html.min.js", "function noisyVendor() {}\n");

  return root;
}

test("generates AST/prose/profile-backed graph artifacts", () => {
  const root = makeWorkspace();
  const result = generateDevWikiGraph({ workspaceRoot: root, project: "sample" });
  const graph = result.graph;

  assert.equal(graph.schema_version, 2);
  assert.equal(graph.metrics.code_file_count, 2);
  assert.ok(graph.metrics.prose_config_file_count >= 3);
  assert.equal(graph.quality.indexed_skill_count, 1);
  assert.equal(graph.quality.indexed_hook_count, 1);
  assert.equal(graph.quality.excluded_count, 1);

  assert.ok(graph.nodes.some((node) => node.id === "skill:ui-spec"));
  assert.ok(graph.nodes.some((node) => node.id === "hook:plugin/develop/hooks/hooks.json#UserPromptSubmit"));
  assert.ok(graph.nodes.some((node) => node.id === "symbol:plugin/develop/scripts/lib/runner-state.mjs#saveState"));

  assert.ok(graph.edges.some((edge) =>
    edge.kind === "imports" &&
    edge.from === "file:plugin/develop/scripts/user-prompt-submit-hook.mjs" &&
    edge.to === "file:plugin/develop/scripts/lib/runner-state.mjs"
  ));
  assert.ok(graph.edges.some((edge) =>
    edge.kind === "calls" &&
    edge.to === "symbol:plugin/develop/scripts/lib/runner-state.mjs#saveState"
  ));

  const hookFile = graph.nodes.find((node) => node.id === "file:plugin/develop/scripts/user-prompt-submit-hook.mjs");
  assert.equal(hookFile.domain, "develop-plugin-runtime");
  assert.equal(hookFile.layer, "hook-cli");

  const graphRoot = path.join(root, ".codex/dev-wiki/source/sample/graph");
  for (const fileName of ["graph.json", "overview.md", "work-routing.md", "impact-map.md", "quality-signals.md"]) {
    assert.equal(fs.existsSync(path.join(graphRoot, fileName)), true, `${fileName} should exist`);
  }
  const routing = fs.readFileSync(path.join(graphRoot, "work-routing.md"), "utf8");
  assert.match(routing, /\/runner 입력 gate/);
});
