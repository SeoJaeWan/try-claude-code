#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const argv = process.argv.slice(2);

const CODE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte"
]);

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".parcel-cache",
  "out"
]);

const EXCLUDED_REL_PREFIXES = [
  ".codex/dev-wiki/source",
  ".codex/plan-wiki/source"
];

const RESERVED_CALLS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "typeof",
  "new",
  "function",
  "class",
  "await"
]);

function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(name) {
  return argv.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node .codex/skills/dev-wiki-graph/scripts/generate-dev-wiki-graph.mjs [--workspace-root <path>] [--project <name>] [--max-files <n>]");
  console.log("");
  console.log("Generates dev wiki graph artifacts under ./.codex/dev-wiki/source/{project}/graph.");
  process.exit(0);
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

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

function shouldExcludeRel(relPath) {
  return EXCLUDED_REL_PREFIXES.some((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`));
}

function walk(root, rel = "", output = []) {
  const dir = path.join(root, rel);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".codex") continue;
    const childRel = slash(path.join(rel, entry.name));
    if (shouldExcludeRel(childRel)) continue;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(root, childRel, output);
    } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
      output.push(childRel);
    }
  }
  return output;
}

function readText(root, relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function lineCount(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function resolveRelativeImport(importerRel, specifier, fileSet) {
  if (!specifier.startsWith(".")) return null;
  const importerDir = slash(path.dirname(importerRel));
  const base = slash(path.normalize(path.join(importerDir, specifier)));
  const candidates = [
    base,
    ...[...CODE_EXTENSIONS].map((ext) => `${base}${ext}`),
    ...[...CODE_EXTENSIONS].map((ext) => `${base}/index${ext}`)
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}

function packageName(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return null;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0];
}

function parseImports(text) {
  const imports = [];
  const importRegex = /import\s+(?:type\s+)?(?:(?<clause>[\s\S]*?)\s+from\s+)?["'](?<specifier>[^"']+)["']/g;
  const exportFromRegex = /export\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+["'](?<specifier>[^"']+)["']/g;
  const requireRegex = /require\(\s*["'](?<specifier>[^"']+)["']\s*\)/g;
  const dynamicRegex = /import\(\s*["'](?<specifier>[^"']+)["']\s*\)/g;

  for (const match of text.matchAll(importRegex)) {
    imports.push({ specifier: match.groups.specifier, clause: match.groups.clause || "", kind: "import" });
  }
  for (const match of text.matchAll(exportFromRegex)) {
    imports.push({ specifier: match.groups.specifier, clause: "", kind: "export-from" });
  }
  for (const match of text.matchAll(requireRegex)) {
    imports.push({ specifier: match.groups.specifier, clause: "", kind: "require" });
  }
  for (const match of text.matchAll(dynamicRegex)) {
    imports.push({ specifier: match.groups.specifier, clause: "", kind: "dynamic-import" });
  }

  return imports;
}

function importedLocalNames(clause) {
  const names = [];
  if (!clause) return names;

  const defaultMatch = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultMatch && !clause.trim().startsWith("{") && !clause.trim().startsWith("*")) {
    names.push(defaultMatch[1]);
  }

  const namedMatch = clause.match(/\{([\s\S]*?)\}/);
  if (namedMatch) {
    for (const raw of namedMatch[1].split(",")) {
      const part = raw.trim();
      if (!part) continue;
      const alias = part.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
      names.push(alias ? alias[1] : part.split(/\s+/)[0]);
    }
  }

  const namespaceMatch = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespaceMatch) names.push(namespaceMatch[1]);

  return names;
}

function symbolKind(name, declarationKind) {
  if (/^use[A-Z0-9]/.test(name)) return "hook";
  if (/^[A-Z]/.test(name) && declarationKind !== "type") return "component";
  if (declarationKind === "type") return "type";
  return "symbol";
}

function parseSymbols(text) {
  const symbols = [];
  const patterns = [
    { kind: "symbol", re: /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g },
    { kind: "symbol", re: /\bfunction\s+([A-Za-z_$][\w$]*)/g },
    { kind: "symbol", re: /\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g },
    { kind: "symbol", re: /\b(?:const|let|var)\s+([A-Z][A-Za-z0-9_$]*|use[A-Z][A-Za-z0-9_$]*)\s*=/g },
    { kind: "symbol", re: /\bexport\s+class\s+([A-Za-z_$][\w$]*)/g },
    { kind: "symbol", re: /\bclass\s+([A-Za-z_$][\w$]*)/g },
    { kind: "type", re: /\bexport\s+(?:interface|type|enum)\s+([A-Za-z_$][\w$]*)/g },
    { kind: "type", re: /\b(?:interface|type|enum)\s+([A-Za-z_$][\w$]*)/g }
  ];

  const seen = new Set();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.re)) {
      const name = match[1];
      if (!name || seen.has(`${name}:${pattern.kind}`)) continue;
      seen.add(`${name}:${pattern.kind}`);
      symbols.push({
        name,
        kind: symbolKind(name, pattern.kind),
        declaration_kind: pattern.kind
      });
    }
  }

  return symbols;
}

function detectRoute(relPath) {
  if (/^app\/.+\/page\.(tsx|jsx|ts|js)$/.test(relPath)) return relPath.replace(/^app\//, "/").replace(/\/page\.(tsx|jsx|ts|js)$/, "");
  if (/^app\/api\/.+\/route\.(ts|js)$/.test(relPath)) return relPath.replace(/^app\/api\//, "/api/").replace(/\/route\.(ts|js)$/, "");
  if (/^src\/app\/.+\/page\.(tsx|jsx|ts|js)$/.test(relPath)) return relPath.replace(/^src\/app\//, "/").replace(/\/page\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/app\/api\/.+\/route\.(ts|js)$/.test(relPath)) return relPath.replace(/^src\/app\/api\//, "/api/").replace(/\/route\.(ts|js)$/, "");
  if (/^pages\/.+\.(tsx|jsx|ts|js)$/.test(relPath)) return relPath.replace(/^pages/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/pages\/.+\.(tsx|jsx|ts|js)$/.test(relPath)) return relPath.replace(/^src\/pages/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  if (/^src\/routes\/.+\.(tsx|jsx|ts|js)$/.test(relPath)) return relPath.replace(/^src\/routes/, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  return null;
}

function isTestFile(relPath) {
  return /(^|\/)(__tests__|test|tests)\//.test(relPath) || /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(relPath);
}

function inferLayer(relPath) {
  const lower = relPath.toLowerCase();
  if (isTestFile(relPath)) return "test";
  if (/(^|\/)(components?|ui|views?|pages|routes|app)\//.test(lower)) return "presentation";
  if (/(^|\/)(services?|use-?cases?|actions?|commands?)\//.test(lower)) return "application";
  if (/(^|\/)(domain|models?|entities|value-objects?)\//.test(lower)) return "domain";
  if (/(^|\/)(repositories?|repo|db|database|prisma|persistence|clients?)\//.test(lower)) return "data";
  if (/(^|\/)(server|api)\//.test(lower)) return "interface";
  return "unknown";
}

function inferDomain(relPath) {
  const parts = relPath.split("/");
  const markerIndex = parts.findIndex((part) => ["features", "domains", "modules", "packages", "apps"].includes(part));
  if (markerIndex >= 0 && parts[markerIndex + 1]) return parts[markerIndex + 1];
  if (parts[0] === "src" && parts[1] && !["components", "hooks", "lib", "utils", "app", "pages", "routes"].includes(parts[1])) return parts[1];
  if (["app", "pages", "routes"].includes(parts[0]) && parts[1]) return parts[1].replace(/\[|\]/g, "");
  return "shared";
}

function detectExternalBoundaries(text) {
  const boundaries = [];
  const envRegex = /\b(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g;
  const urlRegex = /https?:\/\/[^\s"'`)]+/g;

  for (const match of text.matchAll(envRegex)) {
    boundaries.push({ kind: "env", name: match[1] });
  }
  for (const match of text.matchAll(urlRegex)) {
    boundaries.push({ kind: "url", name: match[0] });
  }
  if (/\b(fetch|axios|ky|graphql-request)\s*(?:\(|\.)/.test(text)) {
    boundaries.push({ kind: "external_api", name: "http-client" });
  }
  if (/\b(prisma|drizzle|mongoose|sequelize|knex|pg|mysql|sqlite)\b/i.test(text)) {
    boundaries.push({ kind: "database", name: "database-client" });
  }

  return boundaries;
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

function addEdge(edges, edge) {
  const key = `${edge.from}|${edge.to}|${edge.kind}`;
  if (!edges.has(key)) edges.set(key, edge);
}

function safeMermaidId(value) {
  return value.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 80);
}

function mermaidLabel(value) {
  return value.replace(/"/g, "'");
}

function markdownTable(headers, rows) {
  const out = [];
  out.push(`| ${headers.join(" | ")} |`);
  out.push(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    out.push(`| ${row.map((cell) => String(cell ?? "").replace(/\n/g, " ")).join(" | ")} |`);
  }
  return out.join("\n");
}

function topEntries(map, limit = 30) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function writeGraphArtifacts(outputRoot, graph, fileAnalyses, nodes, edges) {
  mkdirSync(outputRoot, { recursive: true });

  const filesByLayer = new Map();
  const filesByDomain = new Map();
  const externalRows = [];
  const symbolRows = [];
  const callRows = [];

  for (const analysis of fileAnalyses) {
    filesByLayer.set(analysis.layer, (filesByLayer.get(analysis.layer) || 0) + 1);
    filesByDomain.set(analysis.domain, (filesByDomain.get(analysis.domain) || 0) + 1);

    for (const symbol of analysis.symbols.slice(0, 20)) {
      symbolRows.push([symbol.name, symbol.kind, analysis.relPath, analysis.layer, analysis.domain]);
    }
    for (const boundary of analysis.externalBoundaries) {
      externalRows.push([boundary.kind, boundary.name, analysis.relPath]);
    }
  }

  for (const edge of edges.values()) {
    if (edge.kind === "calls") {
      callRows.push([edge.from.replace(/^file:/, "").replace(/^symbol:/, ""), edge.to.replace(/^symbol:/, "").replace(/^file:/, ""), edge.confidence || "direct"]);
    }
  }

  const overview = [
    "# 프로젝트 그래프 개요",
    "",
    `- 프로젝트: \`${graph.project}\``,
    `- 생성 시각: \`${graph.generated_at}\``,
    `- source commit: \`${graph.source_commit || "unknown"}\``,
    `- 분석 파일 수: ${graph.metrics.file_count}`,
    `- symbol 수: ${graph.metrics.symbol_count}`,
    `- import edge 수: ${graph.metrics.import_edge_count}`,
    "",
    "## 먼저 볼 곳",
    "",
    ...graph.entrypoints.slice(0, 20).map((entry) => `- \`${entry}\``),
    "",
    "## 계층 요약",
    "",
    markdownTable(["계층", "파일 수"], topEntries(filesByLayer)),
    "",
    "## 도메인 요약",
    "",
    markdownTable(["도메인", "파일 수"], topEntries(filesByDomain)),
    "",
    "## 분석 메모",
    "",
    "- 이 그래프는 개발 전 탐색을 돕는 지도입니다.",
    "- 동적 import, callback, framework convention, runtime env 연결은 일부 추정 또는 누락될 수 있습니다.",
    ""
  ].join("\n");

  const architecture = [
    "# 아키텍처 지도",
    "",
    "## 계층별 파일",
    "",
    markdownTable(
      ["파일", "계층", "도메인", "LoC", "import"],
      fileAnalyses
        .sort((a, b) => a.relPath.localeCompare(b.relPath))
        .slice(0, 200)
        .map((item) => [item.relPath, item.layer, item.domain, item.loc, item.imports.length])
    ),
    ""
  ].join("\n");

  const symbols = [
    "# Symbol 지도",
    "",
    symbolRows.length
      ? markdownTable(["이름", "종류", "파일", "계층", "도메인"], symbolRows.slice(0, 200))
      : "기록할 주요 symbol을 찾지 못했습니다.",
    ""
  ].join("\n");

  const calls = [
    "# 대표 호출 지도",
    "",
    callRows.length
      ? markdownTable(["호출 위치", "대상", "신뢰도"], callRows.slice(0, 200))
      : "정적으로 확인한 대표 호출 관계가 없습니다.",
    "",
    "## 메모",
    "",
    "이 문서는 직접 구문과 import 정보를 기반으로 한 대표 흐름입니다. 구현 전에는 관련 source file을 다시 확인합니다.",
    ""
  ].join("\n");

  const external = [
    "# 외부 경계 지도",
    "",
    externalRows.length
      ? markdownTable(["종류", "이름", "발견 파일"], externalRows.slice(0, 200))
      : "코드에서 뚜렷한 외부 경계 단서를 찾지 못했습니다.",
    ""
  ].join("\n");

  const mermaidLines = ["flowchart TD"];
  for (const [layer, count] of topEntries(filesByLayer, 12)) {
    mermaidLines.push(`  ${safeMermaidId(`layer_${layer}`)}["${mermaidLabel(layer)} (${count})"]`);
  }
  for (const [domain, count] of topEntries(filesByDomain, 20)) {
    const domainId = safeMermaidId(`domain_${domain}`);
    mermaidLines.push(`  ${domainId}["${mermaidLabel(domain)} (${count})"]`);
  }
  for (const analysis of fileAnalyses.slice(0, 80)) {
    const fileId = safeMermaidId(`file_${analysis.relPath}`);
    mermaidLines.push(`  ${fileId}["${mermaidLabel(analysis.relPath)}"]`);
    mermaidLines.push(`  ${safeMermaidId(`layer_${analysis.layer}`)} --> ${fileId}`);
    mermaidLines.push(`  ${safeMermaidId(`domain_${analysis.domain}`)} --> ${fileId}`);
  }

  writeFileSync(path.join(outputRoot, "overview.md"), overview, "utf8");
  writeFileSync(path.join(outputRoot, "architecture-map.md"), architecture, "utf8");
  writeFileSync(path.join(outputRoot, "symbol-map.md"), symbols, "utf8");
  writeFileSync(path.join(outputRoot, "call-map.md"), calls, "utf8");
  writeFileSync(path.join(outputRoot, "external-boundaries.md"), external, "utf8");
  writeFileSync(path.join(outputRoot, "graph.mmd"), `${mermaidLines.join("\n")}\n`, "utf8");
  writeFileSync(path.join(outputRoot, "graph.json"), `${JSON.stringify(graph, null, 2)}\n`, "utf8");
}

function main() {
  const workspaceRoot = path.resolve(takeFlag("--workspace-root") || repoRoot);
  ensureDirectory("Workspace root", workspaceRoot);

  const configPath = path.join(workspaceRoot, ".codex", "dev-wiki", "config.json");
  if (!existsSync(configPath)) {
    throw new Error("Dev wiki config is missing. Run dev-wiki-setup before generating graph artifacts.");
  }

  const config = readJson(configPath);
  const project = takeFlag("--project") || config.project;
  if (!project) throw new Error("Dev wiki project is missing in config.");

  const sourceRoot = path.join(workspaceRoot, ".codex", "dev-wiki", "source");
  const projectRoot = path.join(sourceRoot, project);
  const graphRoot = path.join(projectRoot, "graph");
  ensureDirectory("Dev wiki source root", sourceRoot);
  ensureDirectory("Dev wiki project root", projectRoot);

  const maxFiles = Number(takeFlag("--max-files") || 1200);
  const files = walk(workspaceRoot).slice(0, maxFiles);
  const fileSet = new Set(files);
  const nodes = new Map();
  const edges = new Map();
  const fileAnalyses = [];
  const symbolByName = new Map();

  addNode(nodes, { id: `project:${project}`, kind: "project", label: project });

  for (const relPath of files) {
    const text = readText(workspaceRoot, relPath);
    const stats = statSync(path.join(workspaceRoot, relPath));
    const imports = parseImports(text);
    const symbols = parseSymbols(text);
    const route = detectRoute(relPath);
    const layer = inferLayer(relPath);
    const domain = inferDomain(relPath);
    const externalBoundaries = detectExternalBoundaries(text);
    const analysis = {
      relPath,
      loc: lineCount(text),
      bytes: stats.size,
      imports,
      symbols,
      route,
      isTest: isTestFile(relPath),
      layer,
      domain,
      externalBoundaries
    };
    fileAnalyses.push(analysis);

    const fileId = `file:${relPath}`;
    addNode(nodes, { id: fileId, kind: analysis.isTest ? "test" : "file", label: relPath, loc: analysis.loc, layer, domain });
    addNode(nodes, { id: `layer:${layer}`, kind: "layer", label: layer });
    addNode(nodes, { id: `domain:${domain}`, kind: "domain", label: domain });
    addEdge(edges, { from: `project:${project}`, to: fileId, kind: "contains", confidence: "direct" });
    addEdge(edges, { from: fileId, to: `layer:${layer}`, kind: "belongs_to_layer", confidence: "inferred" });
    addEdge(edges, { from: fileId, to: `domain:${domain}`, kind: "belongs_to_domain", confidence: "inferred" });

    if (route) {
      const routeId = `route:${route}`;
      addNode(nodes, { id: routeId, kind: "route", label: route });
      addEdge(edges, { from: fileId, to: routeId, kind: "handles_route", confidence: "direct" });
    }

    for (const symbol of symbols) {
      const symbolId = `symbol:${relPath}#${symbol.name}`;
      addNode(nodes, { id: symbolId, kind: symbol.kind, label: symbol.name, file: relPath });
      addEdge(edges, { from: fileId, to: symbolId, kind: "defines", confidence: "direct" });
      if (!symbolByName.has(symbol.name)) symbolByName.set(symbol.name, []);
      symbolByName.get(symbol.name).push({ id: symbolId, file: relPath, symbol });
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

  for (const analysis of fileAnalyses) {
    const fileId = `file:${analysis.relPath}`;
    const text = readText(workspaceRoot, analysis.relPath);
    const importedLocals = new Map();

    for (const item of analysis.imports) {
      const resolved = resolveRelativeImport(analysis.relPath, item.specifier, fileSet);
      if (resolved) {
        addEdge(edges, { from: fileId, to: `file:${resolved}`, kind: "imports", confidence: "direct", specifier: item.specifier });
        for (const local of importedLocalNames(item.clause)) {
          importedLocals.set(local, resolved);
        }
      } else {
        const pkg = packageName(item.specifier);
        if (pkg) {
          const extId = `external:package:${pkg}`;
          addNode(nodes, { id: extId, kind: "external", label: pkg, boundary_kind: "package" });
          addEdge(edges, { from: fileId, to: extId, kind: "depends_on_external", confidence: "direct", specifier: item.specifier });
        }
      }
    }

    const callNames = new Set();
    const callRegex = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    for (const match of text.matchAll(callRegex)) {
      const name = match[1];
      if (RESERVED_CALLS.has(name)) continue;
      callNames.add(name);
    }

    for (const name of callNames) {
      const importedFile = importedLocals.get(name);
      if (importedFile) {
        const targetSymbols = (symbolByName.get(name) || []).filter((item) => item.file === importedFile);
        addEdge(edges, {
          from: fileId,
          to: targetSymbols[0]?.id || `file:${importedFile}`,
          kind: "calls",
          confidence: targetSymbols.length ? "direct" : "inferred"
        });
        continue;
      }

      const localSymbols = (symbolByName.get(name) || []).filter((item) => item.file === analysis.relPath);
      if (localSymbols.length) {
        addEdge(edges, { from: fileId, to: localSymbols[0].id, kind: "calls", confidence: "direct" });
      }
    }
  }

  const importEdges = [...edges.values()].filter((edge) => edge.kind === "imports");
  const fanIn = new Map();
  const fanOut = new Map();
  for (const edge of importEdges) {
    fanOut.set(edge.from, (fanOut.get(edge.from) || 0) + 1);
    fanIn.set(edge.to, (fanIn.get(edge.to) || 0) + 1);
  }

  const entrypoints = files.filter((relPath) =>
    /(^|\/)(main|index|app|server|route|page)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relPath) ||
    /^src\/app\//.test(relPath) ||
    /^app\//.test(relPath)
  );

  const graph = {
    schema_version: 1,
    project,
    generated_at: new Date().toISOString(),
    source_commit: runGit(["rev-parse", "--short", "HEAD"], workspaceRoot),
    entrypoints,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    metrics: {
      file_count: files.length,
      symbol_count: [...nodes.values()].filter((node) => ["symbol", "component", "hook", "type"].includes(node.kind)).length,
      import_edge_count: importEdges.length,
      call_edge_count: [...edges.values()].filter((edge) => edge.kind === "calls").length,
      top_fan_in: topEntries(fanIn, 20),
      top_fan_out: topEntries(fanOut, 20)
    },
    notes: [
      "This graph is a navigation aid, not a complete runtime model.",
      "Dynamic imports, callbacks, dependency injection, framework conventions, and runtime environment bindings may be partial."
    ]
  };

  writeGraphArtifacts(graphRoot, graph, fileAnalyses, nodes, edges);
  console.log(`Generated dev wiki graph for ${project} at ${graphRoot}`);
  console.log(`Files: ${graph.metrics.file_count}, symbols: ${graph.metrics.symbol_count}, imports: ${graph.metrics.import_edge_count}, calls: ${graph.metrics.call_edge_count}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
