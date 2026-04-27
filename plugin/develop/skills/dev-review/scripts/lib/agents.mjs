import fs from "node:fs";
import path from "node:path";

const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---/m;
const YAML_FIELD = (field) =>
  new RegExp(`^${field}\\s*:\\s*(["']?)(.*?)\\1\\s*$`, "m");

export function discoverAvailableAgents(dirs, logger) {
  const seen = new Map();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch (err) {
      logger?.warn(`cannot read agents dir ${dir}: ${err.message}`);
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const filePath = path.join(dir, entry);
      let text;
      try {
        text = fs.readFileSync(filePath, "utf8");
      } catch (err) {
        logger?.warn(`cannot read agent file ${filePath}: ${err.message}`);
        continue;
      }
      const fm = text.match(FRONTMATTER);
      if (!fm) {
        logger?.warn(`agent file missing frontmatter: ${filePath}`);
        continue;
      }
      const nameMatch = fm[1].match(YAML_FIELD("name"));
      const descMatch = fm[1].match(YAML_FIELD("description"));
      if (!nameMatch) {
        logger?.warn(`agent file missing name: ${filePath}`);
        continue;
      }
      const name = nameMatch[2].trim();
      const description = descMatch ? descMatch[2].trim() : "";
      if (!seen.has(name)) {
        seen.set(name, { name, description });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function defaultAgentsDirs(workspaceRoot) {
  // Workspace-local locations (this is where skill code in the host repo lives).
  // The `plugin/develop/agents` entry covers the case where this generator runs
  // from inside the plugin's own source tree during development; in installed
  // / consumer environments these resolve to non-existent paths and are
  // silently skipped by the existsSync gate above.
  const dirs = [
    path.resolve(workspaceRoot, "plugin/develop/agents"),
    path.resolve(workspaceRoot, ".claude/agents"),
  ];

  // Plugin-local location. `CLAUDE_PLUGIN_ROOT` points at the directory that
  // contains `.claude-plugin/plugin.json` — for this plugin that is
  // `plugin/develop/` in the source tree and the cache root in installed
  // environments. Either way, agents live directly under it as `agents/`.
  // Callers that cannot rely on this env var being inherited should pass
  // `--available-agents-dir` explicitly instead of trusting this fallback.
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (pluginRoot) {
    dirs.push(path.resolve(pluginRoot, "agents"));
  }

  return dirs;
}
