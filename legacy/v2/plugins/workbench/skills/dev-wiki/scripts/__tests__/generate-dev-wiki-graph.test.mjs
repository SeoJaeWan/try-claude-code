import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { generateDevWikiGraph } from "../lib/graph-core.mjs";
import { parseCodeFile } from "../lib/code-index.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

function writeFile(root, relPath, content) {
  const filePath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dev-wiki-graph-"));
  const devWikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workbench-dev-wiki-"));
  writeFile(devWikiRoot, "config.json", JSON.stringify({
    repo: "https://github.com/example/dev-wiki.git",
    branch: "main"
  }, null, 2));
  fs.mkdirSync(path.join(devWikiRoot, "source/sample/graph"), { recursive: true });

  writeFile(root, "package.json", JSON.stringify({
    name: "fixture",
    type: "module",
    scripts: {
      test: "node --test",
      build: "next build"
    },
    dependencies: {
      react: "^19.0.0"
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
  writeFile(root, "src/types/api/auth.d.ts", `export interface paths {
  "/auth": unknown;
}
`);
  writeFile(root, "src/types/api/index.d.ts", `import type { paths as Auth } from "./auth";

declare global {
  type paths = Auth;
}
`);
  writeFile(root, "public/logo.svg", `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h16v16H0z"/></svg>
`);
  writeFile(root, "public/hero.png", "fake png bytes");
  writeFile(root, "public/fonts/inter.woff2", "fake font bytes");
  writeFile(root, "plugin/develop/skills/dev-review/assets/vendor/diff2html.min.js", "function noisyVendor() {}\n");

  return { root, devWikiRoot };
}

test("generates facts-first graph artifacts", () => {
  const { root, devWikiRoot } = makeWorkspace();
  const result = generateDevWikiGraph({ workspaceRoot: root, devWikiRoot, project: "sample" });
  const graph = result.graph;

  assert.equal(graph.schema_version, 3);
  assert.equal(graph.metrics.code_file_count, 7);
  assert.ok(graph.metrics.text_file_count >= 4);
  assert.equal(graph.quality.indexed_skill_count, 1);
  assert.equal(graph.quality.indexed_hook_count, 1);
  assert.equal(graph.quality.excluded_count, 1);
  assert.equal(graph.quality.local_import_count, graph.quality.resolved_local_import_count);
  assert.equal(graph.quality.package_script_count, 2);
  assert.equal(graph.quality.indexed_asset_count, 3);
  assert.equal(graph.quality.indexed_image_asset_count, 2);
  assert.equal(graph.quality.indexed_font_asset_count, 1);
  assert.equal(graph.metrics.symbol_count, 0);
  assert.equal(graph.metrics.call_edge_count, 0);

  assert.equal(graph.nodes.some((node) => ["domain", "layer", "owner", "symbol", "component", "type"].includes(node.kind)), false);

  assert.ok(graph.nodes.some((node) => node.id === "skill:ui-spec"));
  assert.ok(graph.nodes.some((node) => node.id === "hook:plugin/develop/hooks/hooks.json#UserPromptSubmit"));
  assert.ok(graph.nodes.some((node) => node.id === "folder:plugin/develop/scripts/lib"));
  assert.ok(graph.nodes.some((node) => node.id === "script:package.json#test"));
  assert.ok(graph.nodes.some((node) => node.id === "dependency:react"));
  assert.ok(graph.nodes.some((node) => node.id === "route:/dashboard"));
  assert.ok(graph.nodes.some((node) => node.id === "asset:public/logo.svg" && node.asset_type === "image"));
  assert.ok(graph.nodes.some((node) => node.id === "asset:public/fonts/inter.woff2" && node.asset_type === "font"));

  assert.ok(graph.edges.some((edge) =>
    edge.kind === "imports" &&
    edge.from === "file:plugin/develop/scripts/user-prompt-submit-hook.mjs" &&
    edge.to === "file:plugin/develop/scripts/lib/runner-state.mjs"
  ));
  assert.ok(graph.edges.some((edge) =>
    edge.kind === "imports" &&
    edge.from === "file:src/types/api/index.d.ts" &&
    edge.to === "file:src/types/api/auth.d.ts"
  ));
  assert.equal(graph.edges.some((edge) => edge.kind === "calls"), false);
  assert.ok(graph.edges.some((edge) =>
    edge.kind === "tests" &&
    edge.from === "file:src/app/dashboard/page.test.tsx" &&
    edge.to === "file:src/app/dashboard/page.tsx"
  ));

  const hookFile = graph.nodes.find((node) => node.id === "file:plugin/develop/scripts/user-prompt-submit-hook.mjs");
  assert.equal(Object.hasOwn(hookFile, "domain"), false);
  assert.equal(Object.hasOwn(hookFile, "layer"), false);
  assert.equal(Object.hasOwn(hookFile, "owner"), false);

  const graphRoot = path.join(devWikiRoot, "source/sample/graph");
  for (const fileName of ["graph.json", "overview.md", "work-routing.md", "impact-map.md", "symbol-map.md", "call-map.md", "quality-signals.md"]) {
    assert.equal(fs.existsSync(path.join(graphRoot, fileName)), true, `${fileName} should exist`);
  }
  const routing = fs.readFileSync(path.join(graphRoot, "work-routing.md"), "utf8");
  assert.match(routing, /패키지 명령/);
  const quality = fs.readFileSync(path.join(graphRoot, "quality-signals.md"), "utf8");
  assert.doesNotMatch(quality, /unknown_ratio/);
  const symbols = fs.readFileSync(path.join(graphRoot, "symbol-map.md"), "utf8");
  assert.match(symbols, /compiler-grade symbol 분석을 생성하지 않습니다/);
  const calls = fs.readFileSync(path.join(graphRoot, "call-map.md"), "utf8");
  assert.match(calls, /함수 호출 관계를 추정하지 않습니다/);
  assert.match(calls, /src\/app\/dashboard\/page\.test\.tsx/);
});

test("scans module navigation facts without compiler parsing", () => {
  const analysis = parseCodeFile("src/routes/example.test.ts", `#!/usr/bin/env node
// import ignored from "./commented.js";
/* export { ignored } from "./block-commented.js"; */
import defaultValue, {
  type Example,
  helper
} from "./static.js";
import "./side-effect.js";
export { shared } from "./re-export.js";
const required = require("./required.cjs");
const dynamic = import("./dynamic.mjs");
const sourceText = \`import("./template-only.js")\`;
const sourcePattern = /import\\("\\.\\/regex-only\\.js"\\)/;
`);

  assert.deepEqual(
    analysis.imports.map((item) => [item.kind, item.specifier]),
    [
      ["import", "./static.js"],
      ["import", "./side-effect.js"],
      ["export-from", "./re-export.js"],
      ["require", "./required.cjs"],
      ["dynamic-import", "./dynamic.mjs"]
    ]
  );
  assert.deepEqual(analysis.exports, [{ specifier: "./re-export.js", kind: "export-from" }]);
  assert.equal(analysis.is_test, true);
  assert.deepEqual(analysis.symbols, []);
  assert.deepEqual(analysis.calls, []);
  assert.deepEqual(analysis.parse_diagnostics, []);
});

test("skips JSX text while scanning JSX and template expressions", () => {
  const analysis = parseCodeFile("src/components/example.tsx", `
const view = (
  <section>
    <pre>import fake from "./jsx-text-fake.js"; require("./jsx-text-fake.cjs")</pre>
    {ready ? import("./jsx-expression.mjs") : require("./jsx-expression.cjs")}
  </section>
);
import "./after-jsx.js";
const template = \`import("./template-text-fake.js") \${import("./template-expression.mjs")} \${require("./template-expression.cjs")}\`;
`);

  assert.deepEqual(
    analysis.imports.map((item) => [item.kind, item.specifier]),
    [
      ["dynamic-import", "./jsx-expression.mjs"],
      ["require", "./jsx-expression.cjs"],
      ["import", "./after-jsx.js"],
      ["dynamic-import", "./template-expression.mjs"],
      ["require", "./template-expression.cjs"]
    ]
  );
});

test("skips JSX text in Babel-compatible JavaScript extensions", () => {
  for (const relPath of ["src/example.js", "src/example.mjs", "src/example.cjs"]) {
    const analysis = parseCodeFile(relPath, `
const view = <pre>require("./jsx-text-fake.js")</pre>;
import "./after-jsx.js";
`);

    assert.deepEqual(
      analysis.imports.map((item) => [item.kind, item.specifier]),
      [["import", "./after-jsx.js"]],
      relPath
    );
  }
});

test("decodes JavaScript escapes in literal module specifiers", () => {
  const analysis = parseCodeFile("src/escaped-imports.js", String.raw`
import "\u002e\x2fstatic.js";
const required = require("\u{2e}\x2frequired.cjs");
const dynamic = import("\x2e\u002fdynamic.mjs");
`);

  assert.deepEqual(
    analysis.imports.map((item) => [item.kind, item.specifier]),
    [
      ["import", "./static.js"],
      ["require", "./required.cjs"],
      ["dynamic-import", "./dynamic.mjs"]
    ]
  );
});

test("does not mistake common TypeScript generic arrows for JSX", () => {
  const source = `
const withDefault = <T = unknown>(value: T) => value;
const withComma = <T,>(value: T) => value;
const withConstraint = <T extends object>(value: T) => value;
const plain = <T>(value: T) => value;
import "./after-generics.js";
`;

  for (const relPath of ["src/generics.tsx", "src/generics.ts", "src/generics.mts", "src/generics.cts"]) {
    const analysis = parseCodeFile(relPath, source);
    assert.deepEqual(
      analysis.imports.map((item) => [item.kind, item.specifier]),
      [["import", "./after-generics.js"]],
      relPath
    );
  }
});

test("skips regex literals after control conditions but keeps division-side imports", () => {
  const analysis = parseCodeFile("src/control-regex.js", String.raw`
if (ok) /require\("\.\/if-fake\.js"\)/.test(text);
while (ok) /import\("\.\/while-fake\.js"\)/.test(text);
for (; ok;) /require\("\.\/for-fake\.js"\)/.test(text);
with (scope) /import\("\.\/with-fake\.js"\)/.test(text);
if (ok) run(); else /require\("\.\/else-fake\.js"\)/.test(text);
do /import\("\.\/do-fake\.js"\)/.test(text); while (ok);
const ratio = calculate(ok) / require("./division-real.cjs");
const ifRatio = obj.if(ok) / require("./if-division.cjs");
const whileRatio = obj?.while(ok) / require("./while-division.cjs");
const forRatio = obj.for(ok) / require("./for-division.cjs");
const withRatio = obj.with(ok) / require("./with-division.cjs");
const returnRatio = obj.return / require("./return-division.cjs");
const throwRatio = obj?.throw / require("./throw-division.cjs");
const awaitRatio = obj.await / require("./await-division.cjs");
const elseRatio = obj.else / require("./else-division.cjs");
const doRatio = obj.do / require("./do-division.cjs");
const typeofRatio = obj.typeof / require("./typeof-division.cjs");
import "./after-control-regex.js";
`);

  assert.deepEqual(
    analysis.imports.map((item) => [item.kind, item.specifier]),
    [
      ["require", "./division-real.cjs"],
      ["require", "./if-division.cjs"],
      ["require", "./while-division.cjs"],
      ["require", "./for-division.cjs"],
      ["require", "./with-division.cjs"],
      ["require", "./return-division.cjs"],
      ["require", "./throw-division.cjs"],
      ["require", "./await-division.cjs"],
      ["require", "./else-division.cjs"],
      ["require", "./do-division.cjs"],
      ["require", "./typeof-division.cjs"],
      ["import", "./after-control-regex.js"]
    ]
  );
});

test("runs from an isolated skill copy without node_modules", () => {
  const isolatedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "isolated-dev-wiki-skill-"));
  const isolatedScripts = path.join(isolatedRoot, "scripts");
  fs.cpSync(path.resolve(TEST_DIR, ".."), isolatedScripts, { recursive: true });

  let ancestor = fs.realpathSync(isolatedScripts);
  while (true) {
    assert.equal(fs.existsSync(path.join(ancestor, "node_modules")), false, `unexpected node_modules ancestor: ${ancestor}`);
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }

  const { root, devWikiRoot } = makeWorkspace();
  const childEnv = { ...process.env };
  delete childEnv.NODE_PATH;
  delete childEnv.NODE_OPTIONS;
  const result = spawnSync(
    process.execPath,
    [
      "--no-global-search-paths",
      path.join(isolatedScripts, "generate-dev-wiki-graph.mjs"),
      "--workspace-root",
      root,
      "--dev-wiki-root",
      devWikiRoot,
      "--project",
      "sample"
    ],
    {
      cwd: isolatedRoot,
      encoding: "utf8",
      env: childEnv
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Generated dev wiki graph for sample/);
  assert.equal(fs.existsSync(path.join(devWikiRoot, "source/sample/graph/graph.json")), true);
});
