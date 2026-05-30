#!/usr/bin/env node

import { generateDevWikiGraph } from "./lib/graph-core.mjs";

const argv = process.argv.slice(2);

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
  console.log("Generates code/prose architecture graph artifacts under ./.codex/dev-wiki/source/{project}/graph.");
  process.exit(0);
}

try {
  const result = generateDevWikiGraph({
    workspaceRoot: takeFlag("--workspace-root") || undefined,
    project: takeFlag("--project") || undefined,
    maxFiles: Number(takeFlag("--max-files") || 2000)
  });
  console.log(`Generated dev wiki graph for ${result.project} at ${result.graphRoot}`);
  console.log(
    `Files: ${result.graph.metrics.file_count}, code: ${result.graph.metrics.code_file_count}, prose/config: ${result.graph.metrics.prose_config_file_count}, symbols: ${result.graph.metrics.symbol_count}, imports: ${result.graph.metrics.import_edge_count}, calls: ${result.graph.metrics.call_edge_count}`
  );
  if (result.graph.quality.warnings.length) {
    console.log(`Warnings: ${result.graph.quality.warnings.map((warning) => warning.code).join(", ")}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
