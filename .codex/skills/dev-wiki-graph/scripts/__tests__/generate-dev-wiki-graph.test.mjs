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

  writeFile(root, "package.json", JSON.stringify({
    name: "fixture",
    type: "module",
    scripts: {
      test: "node --test",
      build: "next build"
    },
    dependencies: {
      react: "^19.0.0"
    },
    devDependencies: {
      typescript: "^6.0.0"
    }
  }, null, 2));
  writeFile(root, "README.md", "# Fixture\n");
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
  writeFile(root, "scripts/typegen.cts", `export function generateTypes() {
  return "ok";
}
`);
  writeFile(root, "src/app/dashboard/page.tsx", `export function DashboardPage() {
  return <main>Dashboard</main>;
}
`);
  writeFile(root, "src/app/dashboard/page.test.tsx", `import { DashboardPage } from "./page";

test("renders", () => DashboardPage());
`);
  writeFile(root, "plugin/develop/skills/dev-review/assets/vendor/diff2html.min.js", "function noisyVendor() {}\n");

  return root;
}

test("generates facts-first graph artifacts", () => {
  const root = makeWorkspace();
  const result = generateDevWikiGraph({ workspaceRoot: root, project: "sample" });
  const graph = result.graph;

  assert.equal(graph.schema_version, 3);
  assert.equal(graph.metrics.code_file_count, 5);
  assert.ok(graph.metrics.text_file_count >= 4);
  assert.equal(graph.quality.indexed_skill_count, 1);
  assert.equal(graph.quality.indexed_hook_count, 1);
  assert.equal(graph.quality.excluded_count, 1);
  assert.equal(graph.quality.local_import_count, graph.quality.resolved_local_import_count);
  assert.equal(graph.quality.package_script_count, 2);

  assert.equal(graph.nodes.some((node) => ["domain", "layer", "owner"].includes(node.kind)), false);

  assert.ok(graph.nodes.some((node) => node.id === "skill:ui-spec"));
  assert.ok(graph.nodes.some((node) => node.id === "hook:plugin/develop/hooks/hooks.json#UserPromptSubmit"));
  assert.ok(graph.nodes.some((node) => node.id === "symbol:plugin/develop/scripts/lib/runner-state.mjs#saveState"));
  assert.ok(graph.nodes.some((node) => node.id === "folder:plugin/develop/scripts/lib"));
  assert.ok(graph.nodes.some((node) => node.id === "script:package.json#test"));
  assert.ok(graph.nodes.some((node) => node.id === "dependency:react"));
  assert.ok(graph.nodes.some((node) => node.id === "route:/dashboard"));

  assert.ok(graph.edges.some((edge) =>
    edge.kind === "imports" &&
    edge.from === "file:plugin/develop/scripts/user-prompt-submit-hook.mjs" &&
    edge.to === "file:plugin/develop/scripts/lib/runner-state.mjs"
  ));
  assert.ok(graph.edges.some((edge) =>
    edge.kind === "calls" &&
    edge.to === "symbol:plugin/develop/scripts/lib/runner-state.mjs#saveState"
  ));
  assert.ok(graph.edges.some((edge) =>
    edge.kind === "tests" &&
    edge.from === "file:src/app/dashboard/page.test.tsx" &&
    edge.to === "file:src/app/dashboard/page.tsx"
  ));

  const hookFile = graph.nodes.find((node) => node.id === "file:plugin/develop/scripts/user-prompt-submit-hook.mjs");
  assert.equal(Object.hasOwn(hookFile, "domain"), false);
  assert.equal(Object.hasOwn(hookFile, "layer"), false);
  assert.equal(Object.hasOwn(hookFile, "owner"), false);

  const graphRoot = path.join(root, ".codex/dev-wiki/source/sample/graph");
  for (const fileName of ["graph.json", "overview.md", "work-routing.md", "impact-map.md", "quality-signals.md"]) {
    assert.equal(fs.existsSync(path.join(graphRoot, fileName)), true, `${fileName} should exist`);
  }
  const routing = fs.readFileSync(path.join(graphRoot, "work-routing.md"), "utf8");
  assert.match(routing, /패키지 명령/);
  const quality = fs.readFileSync(path.join(graphRoot, "quality-signals.md"), "utf8");
  assert.doesNotMatch(quality, /unknown_ratio/);
});
