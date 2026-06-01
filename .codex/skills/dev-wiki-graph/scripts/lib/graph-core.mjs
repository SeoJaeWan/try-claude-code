import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCodeFile, isCodeFile } from "./code-index.mjs";
import { parseProseConfigFile } from "./prose-index.mjs";
import { scanWorkspace } from "./scan.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");

const IMPORT_RESOLUTION_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json"
];
const VERIFY_SCRIPT_RE = /(?:^|:|-)(test|spec|lint|typecheck|check|build|e2e|unit|ci)(?:$|:|-)/i;

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
  const candidates = [
    base,
    ...IMPORT_RESOLUTION_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...IMPORT_RESOLUTION_EXTENSIONS.map((ext) => `${base}/index${ext}`)
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

function addEdge(edges, edge) {
  const key = [
    edge.from,
    edge.to,
    edge.kind,
    edge.specifier || "",
    edge.label || "",
    edge.line || "",
    edge.dependency_type || ""
  ].join("|");
  if (!edges.has(key)) edges.set(key, edge);
}

function addFolderChain(nodes, edges, project, relPath) {
  const dir = path.posix.dirname(relPath);
  if (!dir || dir === ".") return `project:${project}`;

  let parentId = `project:${project}`;
  let current = "";
  for (const part of dir.split("/").filter(Boolean)) {
    current = current ? `${current}/${part}` : part;
    const id = `folder:${current}`;
    addNode(nodes, { id, kind: "folder", label: current, path: current });
    addEdge(edges, { from: parentId, to: id, kind: "contains", confidence: "direct" });
    parentId = id;
  }
  return parentId;
}

function detectExternalBoundaries(text) {
  const boundaries = [];
  const envRegex = /\b(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g;
  const bracketEnvRegex = /\bprocess\.env\[['"]([A-Z0-9_]+)['"]\]/g;
  const urlRegex = /https?:\/\/[^\s"'`)]+/g;

  for (const match of text.matchAll(envRegex)) boundaries.push({ kind: "env", name: match[1] });
  for (const match of text.matchAll(bracketEnvRegex)) boundaries.push({ kind: "env", name: match[1] });
  for (const match of text.matchAll(urlRegex)) boundaries.push({ kind: "url", name: match[0] });
  if (/\b(fetch|axios|ky|graphql-request)\s*(?:\(|\.)/.test(text)) boundaries.push({ kind: "external_api", name: "http-client" });
  if (/\b(git\s+-C|spawnSync\(\s*["']git["'])/.test(text)) boundaries.push({ kind: "git", name: "git-cli" });
  return boundaries;
}

function buildIndexes(nodes, edges) {
  const callers = {};
  const callees = {};
  const importsReverse = {};
  const testsReverse = {};
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
    if (edge.kind === "tests") {
      if (!testsReverse[edge.to]) testsReverse[edge.to] = [];
      testsReverse[edge.to].push(edge.from);
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

  return { callers, callees, imports_reverse: importsReverse, tests_reverse: testsReverse, file_impact: fileImpact };
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

function isDocStartingPoint(relPath) {
  const base = path.posix.basename(relPath);
  return /^(README|AGENTS|CONTRIBUTING|ARCHITECTURE|DEVELOPMENT|SETUP|TESTING)\.md$/i.test(base) || relPath.startsWith("docs/");
}

function packageScriptRows(fileAnalyses) {
  const rows = [];
  for (const analysis of fileAnalyses.filter((item) => item.file_kind === "package_manifest")) {
    for (const [name, command] of Object.entries(analysis.scripts || {})) {
      rows.push({ file: analysis.relPath, name, command });
    }
  }
  return rows;
}

function isRoutingConfig(analysis) {
  const relPath = analysis.relPath;
  const base = path.posix.basename(relPath);
  if (relPath.includes("/artifacts/")) return false;
  if (["wiki_config", "marketplace_config", "package_manifest", "plugin_manifest", "hook_config", "ci_workflow"].includes(analysis.file_kind)) return true;
  if (analysis.file_kind !== "config") return false;
  if (!relPath.includes("/")) return true;
  if (/^(tsconfig|jsconfig|vite|next|nuxt|eslint|prettier|tailwind|postcss|playwright|vitest|jest|webpack|rollup|tsup|turbo|docker-compose)[^.]*\./.test(base)) return true;
  return false;
}

function buildWorkRouting(fileAnalyses) {
  const rows = [];
  const docs = fileAnalyses.filter((item) => isDocStartingPoint(item.relPath)).map((item) => item.relPath).slice(0, 12);
  const tests = fileAnalyses.filter((item) => item.is_test).map((item) => item.relPath).slice(0, 12);
  const routes = fileAnalyses.flatMap((item) => (item.routes || []).map((route) => ({ file: item.relPath, route }))).slice(0, 12);
  const configs = fileAnalyses
    .filter((item) => isRoutingConfig(item))
    .map((item) => item.relPath)
    .slice(0, 16);
  const skillFiles = fileAnalyses.filter((item) => item.file_kind === "skill").map((item) => item.relPath).slice(0, 12);
  const hookFiles = fileAnalyses.filter((item) => item.file_kind === "hook_config").map((item) => item.relPath).slice(0, 12);
  const scripts = packageScriptRows(fileAnalyses);
  const verifyScripts = scripts.filter((script) => VERIFY_SCRIPT_RE.test(script.name)).slice(0, 12);

  if (docs.length) {
    rows.push({
      starting_point: "문서와 프로젝트 지침",
      observed_facts: [`${docs.length}개 문서 시작점`],
      read_first: docs,
      related_files: [],
      verification: []
    });
  }
  if (scripts.length) {
    rows.push({
      starting_point: "패키지 명령",
      observed_facts: scripts.slice(0, 8).map((script) => `${script.file}#${script.name}`),
      read_first: [...new Set(scripts.map((script) => script.file))].slice(0, 8),
      related_files: [],
      verification: verifyScripts.map((script) => `${script.file} scripts.${script.name}: ${script.command}`)
    });
  }
  if (tests.length) {
    rows.push({
      starting_point: "테스트 파일",
      observed_facts: [`${tests.length}개 테스트 파일 예시`],
      read_first: tests,
      related_files: [],
      verification: verifyScripts.map((script) => `${script.file} scripts.${script.name}`)
    });
  }
  if (routes.length) {
    rows.push({
      starting_point: "라우트 파일",
      observed_facts: routes.map((item) => `${item.route} <= ${item.file}`),
      read_first: routes.map((item) => item.file),
      related_files: [],
      verification: verifyScripts.map((script) => `${script.file} scripts.${script.name}`)
    });
  }
  if (configs.length) {
    rows.push({
      starting_point: "설정과 도구 계약",
      observed_facts: configs,
      read_first: configs,
      related_files: [...skillFiles, ...hookFiles],
      verification: verifyScripts.map((script) => `${script.file} scripts.${script.name}`)
    });
  }

  return rows;
}

function buildQuality({ fileAnalyses, excluded, nodes, graphFiles, workspaceRoot, resolutionStats }) {
  const warnings = [];
  const parseDiagnostics = fileAnalyses.flatMap((item) =>
    (item.parse_diagnostics || []).map((diagnostic) => ({
      file: item.relPath,
      message: diagnostic.message,
      pos: diagnostic.pos
    }))
  );
  const missing = graphFiles.filter((relPath) => !existsSync(path.join(workspaceRoot, relPath)));

  if (missing.length) warnings.push({ code: "stale-file-node", detail: `${missing.length} indexed files are missing`, files: missing });
  if (resolutionStats.unresolved_local_imports.length) {
    warnings.push({
      code: "unresolved-local-imports",
      detail: `${resolutionStats.unresolved_local_imports.length}/${resolutionStats.local_import_count} local imports were not resolved`
    });
  }
  if (parseDiagnostics.length) warnings.push({ code: "parse-diagnostics", detail: `${parseDiagnostics.length} syntax parser diagnostics were recorded` });

  const packageScripts = packageScriptRows(fileAnalyses);
  return {
    warnings,
    excluded_count: excluded.length,
    excluded_by_reason: countBy(excluded, (item) => item.reason),
    indexed_skill_count: nodes.filter((node) => node.kind === "skill").length,
    indexed_hook_count: nodes.filter((node) => node.kind === "hook").length,
    indexed_workflow_count: nodes.filter((node) => node.kind === "workflow").length,
    indexed_config_file_count: fileAnalyses.filter((item) => ["config", "wiki_config", "marketplace_config"].includes(item.file_kind)).length,
    indexed_test_file_count: fileAnalyses.filter((item) => item.is_test).length,
    indexed_route_count: nodes.filter((node) => node.kind === "route").length,
    package_script_count: packageScripts.length,
    verification_script_count: packageScripts.filter((script) => VERIFY_SCRIPT_RE.test(script.name)).length,
    env_reference_count: nodes.filter((node) => node.kind === "external" && node.boundary_kind === "env").length,
    external_package_count: nodes.filter((node) => node.kind === "external" && node.boundary_kind === "package").length,
    local_import_count: resolutionStats.local_import_count,
    resolved_local_import_count: resolutionStats.resolved_local_import_count,
    unresolved_local_imports: resolutionStats.unresolved_local_imports,
    dynamic_import_count: resolutionStats.dynamic_import_count,
    parse_diagnostics: parseDiagnostics
  };
}

export function buildGraph({ workspaceRoot, project, maxFiles = 2000 }) {
  const scan = scanWorkspace(workspaceRoot, { maxFiles });
  const fileSet = new Set(scan.files.map((file) => file.path));
  const nodes = new Map();
  const edges = new Map();
  const fileAnalyses = [];
  const symbolByName = new Map();
  const resolutionStats = {
    local_import_count: 0,
    resolved_local_import_count: 0,
    unresolved_local_imports: [],
    dynamic_import_count: 0
  };

  addNode(nodes, { id: `project:${project}`, kind: "project", label: project });

  for (const file of scan.files) {
    const text = readText(workspaceRoot, file.path);
    const externalBoundaries = detectExternalBoundaries(text);
    const baseAnalysis = {
      relPath: file.path,
      file_kind: file.kind,
      loc: lineCount(text),
      bytes: file.bytes,
      externalBoundaries
    };

    let analysis;
    if (file.kind === "code" && isCodeFile(file.path)) {
      analysis = { ...baseAnalysis, ...parseCodeFile(file.path, text) };
    } else {
      analysis = { ...baseAnalysis, ...parseProseConfigFile(file.path, file.kind, text), imports: [], exports: [], symbols: [], calls: [], routes: [], is_test: false };
    }
    analysis.externalBoundaries = externalBoundaries;
    fileAnalyses.push(analysis);

    const fileKind = analysis.is_test ? "test" : "file";
    const fileId = `file:${file.path}`;
    addNode(nodes, {
      id: fileId,
      kind: fileKind,
      label: file.path,
      file_kind: file.kind,
      loc: analysis.loc,
      bytes: file.bytes
    });
    const parentId = addFolderChain(nodes, edges, project, file.path);
    addEdge(edges, { from: parentId, to: fileId, kind: "contains", confidence: "direct" });

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
    if (analysis.file_kind === "ci_workflow") {
      const id = `workflow:${file.path}`;
      addNode(nodes, { id, kind: "workflow", label: analysis.name || file.path, file: file.path, triggers: analysis.triggers || [] });
      addEdge(edges, { from: fileId, to: id, kind: "defines", confidence: "direct" });
    }
    if (["config", "wiki_config", "marketplace_config"].includes(analysis.file_kind)) {
      const id = `config:${file.path}`;
      addNode(nodes, { id, kind: "config", label: file.path, file: file.path, file_kind: analysis.file_kind });
      addEdge(edges, { from: fileId, to: id, kind: "defines", confidence: "direct" });
    }
    if (analysis.file_kind === "package_manifest") {
      for (const [name, command] of Object.entries(analysis.scripts || {})) {
        const id = `script:${file.path}#${name}`;
        addNode(nodes, { id, kind: "script", label: name, command, file: file.path });
        addEdge(edges, { from: fileId, to: id, kind: "defines_script", confidence: "direct" });
      }
      for (const [dependencyType, dependencies] of [
        ["dependencies", analysis.dependencies || []],
        ["devDependencies", analysis.devDependencies || []]
      ]) {
        for (const dependency of dependencies) {
          const id = `dependency:${dependency}`;
          addNode(nodes, { id, kind: "dependency", label: dependency });
          addEdge(edges, { from: fileId, to: id, kind: "declares_dependency", confidence: "direct", dependency_type: dependencyType });
        }
      }
    }

    for (const route of analysis.routes || []) {
      const routeId = `route:${route}`;
      addNode(nodes, { id: routeId, kind: "route", label: route });
      addEdge(edges, { from: fileId, to: routeId, kind: "handles_route", confidence: "direct" });
    }

    for (const symbol of analysis.symbols || []) {
      addNode(nodes, { ...symbol, file: file.path });
      addEdge(edges, { from: fileId, to: symbol.id, kind: "defines", confidence: "direct" });
      if (symbol.exported) addEdge(edges, { from: fileId, to: symbol.id, kind: "exports", confidence: "direct" });
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
      if (item.kind === "dynamic-import") resolutionStats.dynamic_import_count += 1;
      const resolved = resolveRelativeImport(analysis.relPath, item.specifier, fileSet);
      if (item.specifier.startsWith(".")) {
        resolutionStats.local_import_count += 1;
        if (resolved) {
          resolutionStats.resolved_local_import_count += 1;
        } else {
          resolutionStats.unresolved_local_imports.push({ file: analysis.relPath, specifier: item.specifier });
        }
      }

      if (resolved) {
        addEdge(edges, { from: fileId, to: `file:${resolved}`, kind: "imports", confidence: "direct", specifier: item.specifier });
        if (analysis.is_test) addEdge(edges, { from: fileId, to: `file:${resolved}`, kind: "tests", confidence: "direct", specifier: item.specifier });
        if (item.kind === "export-from") addEdge(edges, { from: fileId, to: `file:${resolved}`, kind: "exports", confidence: "direct", specifier: item.specifier });
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
  const quality = buildQuality({ fileAnalyses, excluded: scan.excluded, nodes: nodeList, graphFiles, workspaceRoot, resolutionStats });
  const workRouting = buildWorkRouting(fileAnalyses);

  const sourceStatus = runGit(["status", "--short"], workspaceRoot) || "";
  const graph = {
    schema_version: 3,
    project,
    generated_at: new Date().toISOString(),
    source_commit: runGit(["rev-parse", "--short", "HEAD"], workspaceRoot),
    source_dirty: Boolean(sourceStatus),
    source_status_count: sourceStatus ? sourceStatus.split(/\r?\n/).filter(Boolean).length : 0,
    nodes: nodeList,
    edges: edgeList,
    indexes: queryIndexes,
    work_routing: workRouting,
    metrics: {
      file_count: scan.files.length,
      code_file_count: scan.files.filter((file) => file.kind === "code").length,
      text_file_count: scan.files.filter((file) => file.kind !== "code").length,
      folder_count: nodeList.filter((node) => node.kind === "folder").length,
      symbol_count: nodeList.filter((node) => ["symbol", "component", "hook", "type"].includes(node.kind)).length,
      import_edge_count: edgeList.filter((edge) => edge.kind === "imports").length,
      export_edge_count: edgeList.filter((edge) => edge.kind === "exports").length,
      call_edge_count: edgeList.filter((edge) => edge.kind === "calls").length,
      test_edge_count: edgeList.filter((edge) => edge.kind === "tests").length,
      route_count: nodeList.filter((node) => node.kind === "route").length,
      script_count: nodeList.filter((node) => node.kind === "script").length,
      dependency_count: nodeList.filter((node) => node.kind === "dependency").length,
      external_count: nodeList.filter((node) => node.kind === "external").length,
      file_kinds: countBy(scan.files, (file) => file.kind),
      top_fan_in: topEntries(countBy(edgeList.filter((edge) => edge.kind === "imports"), (edge) => edge.to), 20),
      top_fan_out: topEntries(countBy(edgeList.filter((edge) => edge.kind === "imports"), (edge) => edge.from), 20)
    },
    quality,
    excluded_files: scan.excluded,
    notes: [
      "This graph is a navigation aid, not a complete runtime model.",
      "The code index uses TypeScript syntax AST parsing without type-checking.",
      "The generator records observed repository facts and does not assign subjective domains, layers, or owners."
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

function mermaidLabel(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function writeText(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function topLevelFolderRows(fileNodes) {
  const counts = {};
  for (const node of fileNodes) {
    const first = node.label.includes("/") ? node.label.split("/")[0] : "(root)";
    counts[first] = (counts[first] || 0) + 1;
  }
  return topEntries(counts, 40);
}

function listOrDash(values) {
  return values.length ? values.join(", ") : "-";
}

export function renderArtifacts(graph) {
  const fileNodes = graph.nodes.filter((node) => node.kind === "file" || node.kind === "test");
  const skillNodes = graph.nodes.filter((node) => node.kind === "skill");
  const hookNodes = graph.nodes.filter((node) => node.kind === "hook");
  const workflowNodes = graph.nodes.filter((node) => node.kind === "workflow");
  const scriptNodes = graph.nodes.filter((node) => node.kind === "script");
  const dependencyNodes = graph.nodes.filter((node) => node.kind === "dependency");
  const routeNodes = graph.nodes.filter((node) => node.kind === "route");
  const configNodes = graph.nodes.filter((node) => node.kind === "config");
  const symbolNodes = graph.nodes.filter((node) => ["symbol", "component", "hook", "type"].includes(node.kind));
  const callEdges = graph.edges.filter((edge) => edge.kind === "calls");
  const externalEdges = graph.edges.filter((edge) => edge.kind === "depends_on_external" || edge.kind === "reads_env");
  const testEdges = graph.edges.filter((edge) => edge.kind === "tests");

  const overview = [
    "# 프로젝트 그래프 개요",
    "",
    `- 프로젝트: \`${graph.project}\``,
    `- 생성 시각: \`${graph.generated_at}\``,
    `- source commit: \`${graph.source_commit || "unknown"}\``,
    `- source dirty: ${graph.source_dirty ? `yes (${graph.source_status_count} paths)` : "no"}`,
    `- indexed files: ${graph.metrics.file_count} (code ${graph.metrics.code_file_count}, text/config ${graph.metrics.text_file_count})`,
    `- folders: ${graph.metrics.folder_count}, symbols: ${graph.metrics.symbol_count}, imports: ${graph.metrics.import_edge_count}, calls: ${graph.metrics.call_edge_count}`,
    "",
    "## 먼저 볼 곳",
    "",
    graph.work_routing.length
      ? markdownTable(
          ["시작점", "먼저 볼 파일", "검증 단서"],
          graph.work_routing.map((row) => [row.starting_point, listOrDash(row.read_first.slice(0, 8)), listOrDash(row.verification.slice(0, 4))])
        )
      : "관찰된 시작점이 없습니다.",
    "",
    "## 파일 종류",
    "",
    markdownTable(["kind", "file count"], topEntries(graph.metrics.file_kinds)),
    "",
    "## 신뢰도 메모",
    "",
    "- 코드는 TypeScript syntax AST로만 읽습니다. type-checker나 runtime data-flow는 실행하지 않습니다.",
    "- 그래프는 관찰 가능한 파일, import/export, symbol, test, route, script, dependency, config, env, external reference를 기록합니다.",
    "- 프로젝트별 domain/layer/owner 같은 주관 분류는 생성하지 않습니다.",
    "- 동적 import, path alias, framework convention은 `quality-signals.md`와 원본 source를 함께 확인합니다."
  ].join("\n");

  const architecture = [
    "# 구조 지도",
    "",
    "## 최상위 경로",
    "",
    markdownTable(["경로", "indexed file count"], topLevelFolderRows(fileNodes)),
    "",
    "## 설정 파일",
    "",
    configNodes.length ? markdownTable(["file", "kind"], configNodes.map((node) => [node.file, node.file_kind])) : "설정 파일 node가 없습니다.",
    "",
    "## Package Scripts",
    "",
    scriptNodes.length
      ? markdownTable(["script", "file", "command"], scriptNodes.map((node) => [node.label, node.file, node.command]).slice(0, 80))
      : "package script node가 없습니다.",
    "",
    "## Routes",
    "",
    routeNodes.length ? markdownTable(["route"], routeNodes.map((node) => [node.label]).slice(0, 80)) : "route node가 없습니다.",
    "",
    "## Skills / Hooks / Workflows",
    "",
    markdownTable(
      ["kind", "name", "file"],
      [
        ...skillNodes.map((node) => ["skill", node.label, node.file]),
        ...hookNodes.map((node) => ["hook", node.label, node.file]),
        ...workflowNodes.map((node) => ["workflow", node.label, node.file])
      ].slice(0, 120)
    )
  ].join("\n");

  const symbols = [
    "# Symbol 지도",
    "",
    "이 문서는 AST로 확인한 주요 symbol을 보여줍니다. 전체 목록은 `graph.json`을 봅니다.",
    "",
    markdownTable(
      ["symbol", "kind", "file", "exported"],
      symbolNodes
        .filter((node) => node.file)
        .sort((a, b) => a.file.localeCompare(b.file) || a.label.localeCompare(b.label))
        .slice(0, 180)
        .map((node) => [node.label, node.kind, node.file, node.exported ? "yes" : "no"])
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
          callEdges.slice(0, 220).map((edge) => [edge.from, edge.to, edge.confidence || "direct"])
        )
      : "정적으로 확인한 호출 관계가 없습니다.",
    "",
    "## 테스트 연결",
    "",
    testEdges.length
      ? markdownTable(["test file", "target"], testEdges.slice(0, 120).map((edge) => [edge.from.replace(/^file:/, ""), edge.to.replace(/^file:/, "")]))
      : "정적으로 확인한 test import 관계가 없습니다.",
    "",
    "## 한계",
    "",
    "- Type checker를 사용하지 않으므로 overload, re-export alias, runtime DI/event bus는 완전하지 않습니다.",
    "- Browser event handler와 prose skill command flow는 원본 source와 함께 확인합니다."
  ].join("\n");

  const impactRows = Object.entries(graph.indexes.file_impact)
    .map(([file, impacted]) => [file.replace(/^file:/, ""), impacted.length, impacted.map((item) => item.replace(/^file:/, "")).slice(0, 8).join(", ")])
    .sort((a, b) => b[1] - a[1]);
  const impact = [
    "# 영향 범위 지도",
    "",
    "Rough impact는 reverse import graph 기반입니다. call edge는 symbol 단위 context 보조로 사용합니다.",
    "",
    markdownTable(["file", "reverse import impact", "examples"], impactRows.slice(0, 100)),
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
    "# 작업 시작점 지도",
    "",
    "이 문서는 프로젝트별 의미를 추정하지 않고, 관찰된 파일과 명령을 시작점으로 묶습니다.",
    "",
    graph.work_routing.length
      ? markdownTable(
          ["시작점", "관찰된 사실", "먼저 볼 곳", "관련 파일", "검증 단서"],
          graph.work_routing.map((rule) => [
            rule.starting_point,
            listOrDash(rule.observed_facts.slice(0, 8)),
            listOrDash(rule.read_first.slice(0, 8)),
            listOrDash(rule.related_files.slice(0, 8)),
            listOrDash(rule.verification.slice(0, 6))
          ])
        )
      : "관찰된 시작점이 없습니다."
  ].join("\n");

  const external = [
    "# 외부 경계 지도",
    "",
    "## 코드와 문서에서 관찰한 외부 참조",
    "",
    externalEdges.length
      ? markdownTable(
          ["source", "boundary", "kind"],
          externalEdges.slice(0, 180).map((edge) => [edge.from.replace(/^file:/, ""), edge.to.replace(/^external:/, ""), edge.kind])
        )
      : "외부 참조 edge가 없습니다.",
    "",
    "## Package Dependencies",
    "",
    dependencyNodes.length ? markdownTable(["dependency"], dependencyNodes.map((node) => [node.label]).slice(0, 160)) : "dependency node가 없습니다."
  ].join("\n");

  const quality = [
    "# Graph Quality Signals",
    "",
    `- indexed_file_count: ${graph.metrics.file_count}`,
    `- excluded_count: ${graph.quality.excluded_count}`,
    `- local_imports: ${graph.quality.resolved_local_import_count}/${graph.quality.local_import_count} resolved`,
    `- dynamic_import_count: ${graph.quality.dynamic_import_count}`,
    `- package_script_count: ${graph.quality.package_script_count}`,
    `- verification_script_count: ${graph.quality.verification_script_count}`,
    `- indexed_test_file_count: ${graph.quality.indexed_test_file_count}`,
    `- indexed_route_count: ${graph.quality.indexed_route_count}`,
    `- indexed_config_file_count: ${graph.quality.indexed_config_file_count}`,
    `- env_reference_count: ${graph.quality.env_reference_count}`,
    `- external_package_count: ${graph.quality.external_package_count}`,
    "",
    "## Warnings",
    "",
    graph.quality.warnings.length
      ? markdownTable(["code", "detail"], graph.quality.warnings.map((warning) => [warning.code, warning.detail]))
      : "No graph quality warnings.",
    "",
    "## Unresolved Local Imports",
    "",
    graph.quality.unresolved_local_imports.length
      ? markdownTable(["file", "specifier"], graph.quality.unresolved_local_imports.map((item) => [item.file, item.specifier]).slice(0, 120))
      : "No unresolved local imports.",
    "",
    "## Parse Diagnostics",
    "",
    graph.quality.parse_diagnostics.length
      ? markdownTable(["file", "message"], graph.quality.parse_diagnostics.map((item) => [item.file, item.message]).slice(0, 80))
      : "No parser diagnostics.",
    "",
    "## Excluded Files",
    "",
    graph.excluded_files.length
      ? markdownTable(["file", "reason", "bytes"], graph.excluded_files.map((item) => [item.path, item.reason, item.bytes ?? ""]).slice(0, 160))
      : "No files were excluded by graph-specific filters."
  ].join("\n");

  const mermaidLines = ["flowchart TD"];
  for (const [folder, count] of topLevelFolderRows(fileNodes).slice(0, 30)) {
    const folderId = safeMermaidId(`folder_${folder}`);
    mermaidLines.push(`  ${folderId}["${mermaidLabel(folder)} (${count})"]`);
  }
  for (const edge of graph.edges.filter((item) => item.kind === "imports").slice(0, 80)) {
    const from = safeMermaidId(edge.from);
    const to = safeMermaidId(edge.to);
    mermaidLines.push(`  ${from}["${mermaidLabel(edge.from.replace(/^file:/, ""))}"]`);
    mermaidLines.push(`  ${to}["${mermaidLabel(edge.to.replace(/^file:/, ""))}"]`);
    mermaidLines.push(`  ${from} --> ${to}`);
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
