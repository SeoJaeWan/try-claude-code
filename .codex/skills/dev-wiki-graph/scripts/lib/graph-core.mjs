import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCodeFile, isCodeFile } from "./code-index.mjs";
import { parseProseConfigFile } from "./prose-index.mjs";
import { scanWorkspace } from "./scan.mjs";
import { classifyPath, loadProfile, WORK_ROUTING_RULES } from "./profile.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

function ensureDirectory(label, value) {
  if (!existsSync(value) || !lstatSync(value).isDirectory()) {
    throw new Error(`${label} not found: ${value}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function readText(root, relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function lineCount(text) {
  return text ? text.split(/\r?\n/).length : 0;
}

function packageName(specifier) {
  if (!specifier || specifier.startsWith(".") || specifier.startsWith("/")) return null;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0];
}

function resolveRelativeImport(importerRel, specifier, fileSet) {
  if (!specifier.startsWith(".")) return null;
  const importerDir = path.posix.dirname(importerRel);
  const base = path.posix.normalize(path.posix.join(importerDir, specifier));
  const extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
  const candidates = [
    base,
    ...extensions.map((ext) => `${base}${ext}`),
    ...extensions.map((ext) => `${base}/index${ext}`)
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

function addEdge(edges, edge) {
  const key = `${edge.from}|${edge.to}|${edge.kind}|${edge.label || ""}`;
  if (!edges.has(key)) edges.set(key, edge);
}

function detectExternalBoundaries(text) {
  const boundaries = [];
  const envRegex = /\b(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g;
  const urlRegex = /https?:\/\/[^\s"'`)]+/g;
  for (const match of text.matchAll(envRegex)) boundaries.push({ kind: "env", name: match[1] });
  for (const match of text.matchAll(urlRegex)) boundaries.push({ kind: "url", name: match[0] });
  if (/\b(fetch|axios|ky|graphql-request)\s*(?:\(|\.)/.test(text)) boundaries.push({ kind: "external_api", name: "http-client" });
  if (/\b(git\s+-C|spawnSync\(\s*["']git["'])/.test(text)) boundaries.push({ kind: "git", name: "git-cli" });
  return boundaries;
}

function buildIndexes(nodes, edges) {
  const callers = {};
  const callees = {};
  const importsReverse = {};
  const fileImpact = {};

  for (const edge of edges) {
    if (edge.kind === "calls") {
      if (!callers[edge.to]) callers[edge.to] = [];
      callers[edge.to].push(edge.from);
      if (!callees[edge.from]) callees[edge.from] = [];
      callees[edge.from].push(edge.to);
    }
    if (edge.kind === "imports") {
      if (!importsReverse[edge.to]) importsReverse[edge.to] = [];
      importsReverse[edge.to].push(edge.from);
    }
  }

  const fileNodes = nodes.filter((node) => node.kind === "file" || node.kind === "test");
  for (const file of fileNodes) {
    const impacted = new Set();
    const queue = [file.id];
    while (queue.length) {
      const current = queue.shift();
      for (const next of importsReverse[current] || []) {
        if (!impacted.has(next)) {
          impacted.add(next);
          queue.push(next);
        }
      }
    }
    fileImpact[file.id] = [...impacted].sort();
  }

  return { callers, callees, imports_reverse: importsReverse, file_impact: fileImpact };
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function topEntries(object, limit = 20) {
  return Object.entries(object).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function buildQuality({ fileAnalyses, excluded, nodes, graphFiles, workspaceRoot }) {
  const codeFiles = fileAnalyses.filter((item) => item.file_kind === "code");
  const unknownCount = codeFiles.filter((item) => item.layer === "unknown" || item.domain === "shared").length;
  const unknownRatio = codeFiles.length ? unknownCount / codeFiles.length : 0;
  const skillCount = nodes.filter((node) => node.kind === "skill").length;
  const hookCount = nodes.filter((node) => node.kind === "hook").length;
  const warnings = [];
  if (unknownRatio > 0.3) warnings.push({ code: "high-unknown-ratio", detail: `${unknownCount}/${codeFiles.length} code files are shared/unknown` });
  if (skillCount === 0) warnings.push({ code: "no-skill-nodes", detail: "No SKILL.md files were indexed." });
  if (hookCount === 0) warnings.push({ code: "no-hook-nodes", detail: "No hooks.json files were indexed." });

  const missing = graphFiles.filter((relPath) => !existsSync(path.join(workspaceRoot, relPath)));
  if (missing.length) warnings.push({ code: "stale-file-node", detail: `${missing.length} indexed files are missing`, files: missing });

  return {
    warnings,
    unknown_ratio: Number(unknownRatio.toFixed(3)),
    excluded_count: excluded.length,
    excluded_by_reason: countBy(excluded, (item) => item.reason),
    indexed_skill_count: skillCount,
    indexed_hook_count: hookCount
  };
}

export function buildGraph({ workspaceRoot, project, maxFiles = 2000 }) {
  const profile = loadProfile();
  const scan = scanWorkspace(workspaceRoot, { maxFiles });
  const fileSet = new Set(scan.files.map((file) => file.path));
  const nodes = new Map();
  const edges = new Map();
  const fileAnalyses = [];
  const symbolByName = new Map();

  addNode(nodes, { id: `project:${project}`, kind: "project", label: project });

  for (const file of scan.files) {
    const text = readText(workspaceRoot, file.path);
    const classification = classifyPath(file.path, profile);
    const externalBoundaries = detectExternalBoundaries(text);
    const baseAnalysis = {
      relPath: file.path,
      file_kind: file.kind,
      loc: lineCount(text),
      bytes: file.bytes,
      ...classification,
      externalBoundaries
    };

    let analysis;
    if (file.kind === "code" && isCodeFile(file.path)) {
      analysis = { ...baseAnalysis, ...parseCodeFile(file.path, text) };
    } else {
      analysis = { ...baseAnalysis, ...parseProseConfigFile(file.path, file.kind, text), imports: [], exports: [], symbols: [], calls: [], routes: [] };
    }
    analysis.externalBoundaries = externalBoundaries;
    analysis.domain = classification.domain;
    analysis.layer = classification.layer;
    analysis.owner = classification.owner;
    fileAnalyses.push(analysis);

    const fileKind = analysis.is_test ? "test" : "file";
    const fileId = `file:${file.path}`;
    addNode(nodes, {
      id: fileId,
      kind: fileKind,
      label: file.path,
      file_kind: file.kind,
      loc: analysis.loc,
      bytes: file.bytes,
      domain: analysis.domain,
      layer: analysis.layer,
      owner: analysis.owner
    });
    addEdge(edges, { from: `project:${project}`, to: fileId, kind: "contains", confidence: "direct" });

    for (const key of ["domain", "layer", "owner"]) {
      const value = analysis[key];
      if (!value) continue;
      addNode(nodes, { id: `${key}:${value}`, kind: key, label: value });
      addEdge(edges, { from: fileId, to: `${key}:${value}`, kind: `belongs_to_${key}`, confidence: "inferred" });
    }

    if (analysis.file_kind === "skill") {
      const id = `skill:${analysis.name}`;
      addNode(nodes, { id, kind: "skill", label: analysis.name, description: analysis.description, file: file.path });
      addEdge(edges, { from: fileId, to: id, kind: "defines", confidence: "direct" });
    }
    if (analysis.file_kind === "agent") {
      const id = `agent:${analysis.name}`;
      addNode(nodes, { id, kind: "agent", label: analysis.name, description: analysis.description, file: file.path, skills: analysis.skills });
      addEdge(edges, { from: fileId, to: id, kind: "defines", confidence: "direct" });
      if (analysis.skills) addEdge(edges, { from: id, to: `skill:${analysis.skills}`, kind: "uses_skill", confidence: "direct" });
    }
    if (analysis.file_kind === "hook_config") {
      for (const eventName of Object.keys(analysis.hooks || {})) {
        const id = `hook:${file.path}#${eventName}`;
        addNode(nodes, { id, kind: "hook", label: eventName, file: file.path });
        addEdge(edges, { from: fileId, to: id, kind: "defines", confidence: "direct" });
      }
    }
    if (analysis.file_kind === "plugin_manifest") {
      const id = `plugin:${analysis.name || file.path}`;
      addNode(nodes, { id, kind: "plugin", label: analysis.name || file.path, version: analysis.version, file: file.path });
      addEdge(edges, { from: fileId, to: id, kind: "defines", confidence: "direct" });
    }

    for (const route of analysis.routes || []) {
      const routeId = `route:${route}`;
      addNode(nodes, { id: routeId, kind: "route", label: route });
      addEdge(edges, { from: fileId, to: routeId, kind: "handles_route", confidence: "direct" });
    }

    for (const symbol of analysis.symbols || []) {
      addNode(nodes, { ...symbol, file: file.path });
      addEdge(edges, { from: fileId, to: symbol.id, kind: "defines", confidence: "direct" });
      if (!symbolByName.has(symbol.name)) symbolByName.set(symbol.name, []);
      symbolByName.get(symbol.name).push({ ...symbol, file: file.path });
    }

    for (const boundary of externalBoundaries) {
      const extId = `external:${boundary.kind}:${boundary.name}`;
      addNode(nodes, { id: extId, kind: "external", label: boundary.name, boundary_kind: boundary.kind });
      addEdge(edges, {
        from: fileId,
        to: extId,
        kind: boundary.kind === "env" ? "reads_env" : "depends_on_external",
        confidence: "direct"
      });
    }
  }

  for (const analysis of fileAnalyses.filter((item) => item.file_kind === "code")) {
    const fileId = `file:${analysis.relPath}`;
    const importedLocals = new Map();

    for (const item of analysis.imports || []) {
      const resolved = resolveRelativeImport(analysis.relPath, item.specifier, fileSet);
      if (resolved) {
        addEdge(edges, { from: fileId, to: `file:${resolved}`, kind: "imports", confidence: "direct", specifier: item.specifier });
        for (const name of item.names || []) importedLocals.set(name.local, { file: resolved, imported: name.imported });
      } else {
        const pkg = packageName(item.specifier);
        if (pkg) {
          const extId = `external:package:${pkg}`;
          addNode(nodes, { id: extId, kind: "external", label: pkg, boundary_kind: "package" });
          addEdge(edges, { from: fileId, to: extId, kind: "depends_on_external", confidence: "direct", specifier: item.specifier });
        }
      }
    }

    for (const call of analysis.calls || []) {
      const imported = importedLocals.get(call.name);
      if (imported) {
        const targetSymbols = (symbolByName.get(imported.imported === "default" ? call.name : imported.imported) || []).filter((item) => item.file === imported.file);
        addEdge(edges, {
          from: call.caller || fileId,
          to: targetSymbols[0]?.id || `file:${imported.file}`,
          kind: "calls",
          confidence: targetSymbols.length ? "direct" : "inferred",
          line: call.pos
        });
      } else {
        const localSymbols = (symbolByName.get(call.name) || []).filter((item) => item.file === analysis.relPath);
        if (localSymbols.length) {
          addEdge(edges, { from: call.caller || fileId, to: localSymbols[0].id, kind: "calls", confidence: "direct", line: call.pos });
        }
      }
    }
  }

  const nodeList = [...nodes.values()];
  const edgeList = [...edges.values()];
  const queryIndexes = buildIndexes(nodeList, edgeList);
  const graphFiles = scan.files.map((file) => file.path);
  const quality = buildQuality({ fileAnalyses, excluded: scan.excluded, nodes: nodeList, graphFiles, workspaceRoot });

  const sourceStatus = runGit(["status", "--short"], workspaceRoot) || "";
  const graph = {
    schema_version: 2,
    project,
    generated_at: new Date().toISOString(),
    source_commit: runGit(["rev-parse", "--short", "HEAD"], workspaceRoot),
    source_dirty: Boolean(sourceStatus),
    source_status_count: sourceStatus ? sourceStatus.split(/\r?\n/).filter(Boolean).length : 0,
    nodes: nodeList,
    edges: edgeList,
    indexes: queryIndexes,
    work_routing: WORK_ROUTING_RULES,
    metrics: {
      file_count: scan.files.length,
      code_file_count: scan.files.filter((file) => file.kind === "code").length,
      prose_config_file_count: scan.files.filter((file) => file.kind !== "code").length,
      symbol_count: nodeList.filter((node) => ["symbol", "component", "hook", "type"].includes(node.kind)).length,
      import_edge_count: edgeList.filter((edge) => edge.kind === "imports").length,
      call_edge_count: edgeList.filter((edge) => edge.kind === "calls").length,
      domains: countBy(nodeList.filter((node) => node.kind === "file" || node.kind === "test"), (node) => node.domain),
      layers: countBy(nodeList.filter((node) => node.kind === "file" || node.kind === "test"), (node) => node.layer),
      owners: countBy(nodeList.filter((node) => node.kind === "file" || node.kind === "test"), (node) => node.owner),
      top_fan_in: topEntries(countBy(edgeList.filter((edge) => edge.kind === "imports"), (edge) => edge.to), 20),
      top_fan_out: topEntries(countBy(edgeList.filter((edge) => edge.kind === "imports"), (edge) => edge.from), 20)
    },
    quality,
    excluded_files: scan.excluded,
    notes: [
      "This graph is a navigation aid, not a complete runtime model.",
      "The code index uses TypeScript syntax AST parsing without type-checking.",
      "Prose/config and architecture overlay supply project workflow intent that syntax alone cannot infer."
    ]
  };

  return { graph, fileAnalyses };
}

function markdownTable(headers, rows) {
  const out = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const row of rows) out.push(`| ${row.map((cell) => String(cell ?? "").replace(/\n/g, " ")).join(" | ")} |`);
  return out.join("\n");
}

function safeMermaidId(value) {
  return value.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 80);
}

function writeText(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function renderArtifacts(graph, fileAnalyses) {
  const fileNodes = graph.nodes.filter((node) => node.kind === "file" || node.kind === "test");
  const skillNodes = graph.nodes.filter((node) => node.kind === "skill");
  const hookNodes = graph.nodes.filter((node) => node.kind === "hook");
  const symbolNodes = graph.nodes.filter((node) => ["symbol", "component", "hook", "type"].includes(node.kind));
  const callEdges = graph.edges.filter((edge) => edge.kind === "calls");
  const externalEdges = graph.edges.filter((edge) => edge.kind === "depends_on_external" || edge.kind === "reads_env");

  const overview = [
    "# 프로젝트 그래프 개요",
    "",
    `- 프로젝트: \`${graph.project}\``,
    `- 생성 시각: \`${graph.generated_at}\``,
    `- source commit: \`${graph.source_commit || "unknown"}\``,
    `- source dirty: ${graph.source_dirty ? `yes (${graph.source_status_count} paths)` : "no"}`,
    `- indexed files: ${graph.metrics.file_count} (code ${graph.metrics.code_file_count}, prose/config ${graph.metrics.prose_config_file_count})`,
    `- symbol nodes: ${graph.metrics.symbol_count}, import edges: ${graph.metrics.import_edge_count}, call edges: ${graph.metrics.call_edge_count}`,
    "",
    "## 먼저 볼 곳",
    "",
    markdownTable(["목적", "파일"], [
      ["저장소 전체 맥락", "README.md, AGENTS.md"],
      ["Codex planning stack", ".codex/skills/*/SKILL.md, .codex/tools/*.mjs"],
      ["Claude develop plugin", "plugin/develop/.claude-plugin/plugin.json, plugin/develop/hooks/hooks.json"],
      ["runner/dev-review 공유 상태", "plugin/develop/scripts/lib/runner-state.mjs, plugin/develop/scripts/runner-state-cli.mjs"],
      ["구현 리뷰", "plugin/develop/skills/dev-review/scripts/generate-review-data.mjs, plugin/develop/skills/dev-review/scripts/server.mjs"],
      ["statusline", "plugin/statusline/hooks/hooks.json, plugin/statusline/src/status-line.mjs"],
      ["작업 라우팅", "graph/work-routing.md"],
      ["영향 범위", "graph/impact-map.md"],
      ["품질 신호", "graph/quality-signals.md"]
    ]),
    "",
    "## Domain Summary",
    "",
    markdownTable(["domain", "file count"], topEntries(graph.metrics.domains)),
    "",
    "## Layer Summary",
    "",
    markdownTable(["layer", "file count"], topEntries(graph.metrics.layers)),
    "",
    "## 신뢰도 메모",
    "",
    "- Code files are parsed with TypeScript syntax AST only; no type-checker or variable data-flow is run.",
    "- SKILL.md, agents, hooks, plugin manifests, package scripts, and workflows are indexed as prose/config nodes.",
    "- Domain/layer/owner values come from project profile overlay rules and are intentionally navigation-oriented.",
    "- See `quality-signals.md` for unknown coverage and excluded vendor/generated files."
  ].join("\n");

  const architecture = [
    "# 아키텍처 지도",
    "",
    "## Domain / Layer / Owner",
    "",
    markdownTable(
      ["파일", "domain", "layer", "owner", "kind"],
      fileNodes
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((node) => [node.label, node.domain, node.layer, node.owner, node.file_kind])
    ),
    "",
    "## Skill Nodes",
    "",
    skillNodes.length
      ? markdownTable(["skill", "file", "description"], skillNodes.map((node) => [node.label, node.file, node.description || ""]))
      : "Indexed skill node가 없습니다.",
    "",
    "## Hook Nodes",
    "",
    hookNodes.length
      ? markdownTable(["hook event", "file"], hookNodes.map((node) => [node.label, node.file]))
      : "Indexed hook node가 없습니다."
  ].join("\n");

  const symbols = [
    "# Symbol 지도",
    "",
    "이 문서는 AST로 확인한 주요 symbol 중 navigation 가치가 높은 항목을 보여줍니다. 전체 목록은 `graph.json`을 봅니다.",
    "",
    markdownTable(
      ["symbol", "kind", "file"],
      symbolNodes
        .filter((node) => node.file)
        .sort((a, b) => a.file.localeCompare(b.file) || a.label.localeCompare(b.label))
        .slice(0, 160)
        .map((node) => [node.label, node.kind, node.file])
    )
  ].join("\n");

  const calls = [
    "# 대표 호출 지도",
    "",
    "이 지도는 AST call expression과 import alias를 기반으로 한 rough caller/callee map입니다.",
    "",
    callEdges.length
      ? markdownTable(
          ["caller", "callee", "confidence"],
          callEdges.slice(0, 200).map((edge) => [edge.from, edge.to, edge.confidence || "direct"])
        )
      : "정적으로 확인한 호출 관계가 없습니다.",
    "",
    "## Blind Spots",
    "",
    "- Type checker를 사용하지 않으므로 overload, re-export alias, runtime DI/event bus는 완전하지 않습니다.",
    "- Browser event handler와 prose skill command flow는 workflow/work-routing 산출물을 함께 봅니다."
  ].join("\n");

  const impactRows = Object.entries(graph.indexes.file_impact)
    .map(([file, impacted]) => [file.replace(/^file:/, ""), impacted.length, impacted.map((item) => item.replace(/^file:/, "")).slice(0, 8).join(", ")])
    .sort((a, b) => b[1] - a[1]);
  const impact = [
    "# 영향 범위 지도",
    "",
    "Rough impact는 reverse import graph 기반입니다. call edge는 symbol 단위 context 보조로 사용합니다.",
    "",
    markdownTable(["file", "reverse import impact", "examples"], impactRows.slice(0, 80)),
    "",
    "## Top Fan-In",
    "",
    markdownTable(["target", "count"], graph.metrics.top_fan_in),
    "",
    "## Top Fan-Out",
    "",
    markdownTable(["source", "count"], graph.metrics.top_fan_out)
  ].join("\n");

  const workRouting = [
    "# 작업 라우팅 지도",
    "",
    "사용자 요청을 받았을 때 먼저 읽을 계약과 수정 후보를 고르는 rough routing table입니다.",
    "",
    markdownTable(
      ["작업 유형", "트리거", "먼저 볼 곳", "수정 후보", "검증"],
      graph.work_routing.map((rule) => [
        rule.work_type,
        rule.triggers.join(", "),
        rule.read_first.join(", "),
        rule.edit_candidates.join(", "),
        rule.verify.join(", ")
      ])
    )
  ].join("\n");

  const external = [
    "# 외부 경계 지도",
    "",
    markdownTable(
      ["source", "boundary", "kind"],
      externalEdges.slice(0, 160).map((edge) => [edge.from.replace(/^file:/, ""), edge.to.replace(/^external:/, ""), edge.kind])
    ),
    "",
    "## Artifact Boundaries",
    "",
    markdownTable(["artifact", "producer", "consumer"], [
      ["plans/{plan_key}/.runner-state.json", "runner skill", "runner, dev-review, runner-state CLI"],
      ["plans/{key}/dev-review/review-data.json", "generate-review-data.mjs", "dev-review server/UI"],
      ["plans/{key}/dev-review/feedback.json", "dev-review server/UI", "runner rework/QA/out-of-scope routing"],
      ["plans/{task}/planning-docs/review-data.json", "orchestrator package generator", "planning docs browser server"],
      [".codex/plan-wiki/source/feedback/inbox/*.json", "plan wiki docs server", "plan-wiki-apply-feedback"],
      [".codex/dev-wiki/source/{project}/graph/*", "dev-wiki-graph", "developers and future Codex navigation"]
    ])
  ].join("\n");

  const quality = [
    "# Graph Quality Signals",
    "",
    `- unknown_ratio: ${graph.quality.unknown_ratio}`,
    `- excluded_count: ${graph.quality.excluded_count}`,
    `- indexed_skill_count: ${graph.quality.indexed_skill_count}`,
    `- indexed_hook_count: ${graph.quality.indexed_hook_count}`,
    "",
    "## Warnings",
    "",
    graph.quality.warnings.length
      ? markdownTable(["code", "detail"], graph.quality.warnings.map((warning) => [warning.code, warning.detail]))
      : "No graph quality warnings.",
    "",
    "## Excluded Files",
    "",
    graph.excluded_files.length
      ? markdownTable(["file", "reason", "bytes"], graph.excluded_files.map((item) => [item.path, item.reason, item.bytes]))
      : "No files were excluded by graph-specific filters."
  ].join("\n");

  const mermaidLines = ["flowchart TD"];
  for (const [domain, count] of topEntries(graph.metrics.domains, 20)) {
    mermaidLines.push(`  ${safeMermaidId(`domain_${domain}`)}["${domain} (${count})"]`);
  }
  for (const node of fileNodes.slice(0, 100)) {
    const fileId = safeMermaidId(`file_${node.label}`);
    mermaidLines.push(`  ${fileId}["${node.label}"]`);
    mermaidLines.push(`  ${safeMermaidId(`domain_${node.domain}`)} --> ${fileId}`);
  }

  return {
    "overview.md": overview,
    "architecture-map.md": architecture,
    "symbol-map.md": symbols,
    "call-map.md": calls,
    "impact-map.md": impact,
    "work-routing.md": workRouting,
    "external-boundaries.md": external,
    "quality-signals.md": quality,
    "graph.mmd": mermaidLines.join("\n"),
    "graph.json": JSON.stringify(graph, null, 2)
  };
}

export function writeGraphArtifacts(outputRoot, graph, fileAnalyses) {
  const rendered = renderArtifacts(graph, fileAnalyses);
  for (const [fileName, content] of Object.entries(rendered)) {
    writeText(path.join(outputRoot, fileName), content);
  }
}

export function resolveGenerationContext({ workspaceRoot = REPO_ROOT, project = null } = {}) {
  const root = path.resolve(workspaceRoot);
  ensureDirectory("Workspace root", root);
  const configPath = path.join(root, ".codex", "dev-wiki", "config.json");
  if (!existsSync(configPath)) {
    throw new Error("Dev wiki config is missing. Run dev-wiki-setup before generating graph artifacts.");
  }
  const config = readJson(configPath);
  const resolvedProject = project || config.project;
  if (!resolvedProject) throw new Error("Dev wiki project is missing in config.");
  const sourceRoot = path.join(root, ".codex", "dev-wiki", "source");
  const projectRoot = path.join(sourceRoot, resolvedProject);
  const graphRoot = path.join(projectRoot, "graph");
  ensureDirectory("Dev wiki source root", sourceRoot);
  ensureDirectory("Dev wiki project root", projectRoot);
  return { workspaceRoot: root, project: resolvedProject, graphRoot };
}

export function generateDevWikiGraph(options = {}) {
  const context = resolveGenerationContext(options);
  const { graph, fileAnalyses } = buildGraph({ ...context, maxFiles: options.maxFiles });
  writeGraphArtifacts(context.graphRoot, graph, fileAnalyses);
  return { ...context, graph, fileAnalyses };
}
