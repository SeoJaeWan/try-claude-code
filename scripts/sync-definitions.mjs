#!/usr/bin/env node

/**
 * sync-definitions.mjs
 *
 * Canonical source: plugin/  →  Generated target: .codex/
 *
 * Syncs agent and skill definitions from plugin/ (Claude Code) to .codex/ (Codex).
 * Only items listed in sync-config.json are synced.
 * Codex-only items (e.g. planner.toml) are never touched.
 *
 * - Agents: plugin .md → codex .toml
 * - Skills: plugin SKILL.md → codex SKILL.md (frontmatter transformed)
 *
 * Usage:
 *   node scripts/sync-definitions.mjs           # sync listed items
 *   node scripts/sync-definitions.mjs --dry-run  # preview changes
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PLUGIN_DIR = join(ROOT, "plugin");
const CODEX_DIR = join(ROOT, ".codex");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Load sync config ─────────────────────────────────────────────────

const config = JSON.parse(readFileSync(join(__dirname, "sync-config.json"), "utf-8"));
const AGENT_LIST = new Set(config.agents.sync);
const SKILL_LIST = new Set(config.skills.sync);
const CODEX_OVERRIDES = config.agents.codexOverrides;

// ── YAML frontmatter parser ──────────────────────────────────────────

function parseFrontmatter(content) {
  // Normalize line endings to LF
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: normalized };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    meta[key] = val;
  }
  return { meta, body: match[2] };
}

// ── TOML serializer (minimal, covers our needs) ─────────────────────

function toTomlString(val) {
  if (typeof val === "string") {
    if (val.includes("\n")) return `"""\n${val}\n"""`;
    return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  if (typeof val === "boolean") return val ? "true" : "false";
  if (Array.isArray(val)) return `[${val.map(toTomlString).join(", ")}]`;
  return String(val);
}

// ── Agent sync: plugin .md → codex .toml ─────────────────────────────

function extractTag(body, tag) {
  const match = body.match(new RegExp(`<${tag}>\\n?([\\s\\S]*?)\\n?<\\/${tag}>`));
  return match ? match[1].trim() : "";
}

function syncAgent(name) {
  const pluginFile = join(PLUGIN_DIR, "agents", `${name}.md`);
  if (!existsSync(pluginFile)) {
    console.log(`  [warn] plugin/agents/${name}.md not found, skipping`);
    return null;
  }

  const content = readFileSync(pluginFile, "utf-8");
  const { meta, body } = parseFrontmatter(content);

  const overrides = CODEX_OVERRIDES[name] || {
    model: "gpt-5.4",
    model_reasoning_effort: "xhigh",
    sandbox_mode: "workspace-write",
    nickname_candidates: [name],
  };

  const role = extractTag(body, "Role");
  const instructions = extractTag(body, "Instructions");
  const devInstructions = [role, instructions].filter(Boolean).join("\n\n");
  const skillName = meta.skills || "";

  const lines = [];
  lines.push(`name = ${toTomlString(name)}`);
  lines.push(`description = ${toTomlString(meta.description || "")}`);
  lines.push(`model = ${toTomlString(overrides.model)}`);
  lines.push(`model_reasoning_effort = ${toTomlString(overrides.model_reasoning_effort)}`);
  lines.push(`sandbox_mode = ${toTomlString(overrides.sandbox_mode)}`);
  lines.push(`nickname_candidates = ${toTomlString(overrides.nickname_candidates)}`);
  lines.push(`developer_instructions = ${toTomlString(devInstructions)}`);

  if (skillName) {
    lines.push("");
    lines.push("[[skills.config]]");
    lines.push(`path = "../skills/${skillName}"`);
    lines.push("enabled = true");
  }

  lines.push("");

  return {
    name,
    outPath: join(CODEX_DIR, "agents", `${name}.toml`),
    content: lines.join("\n"),
  };
}

// ── Skill sync: plugin SKILL.md → codex SKILL.md ────────────────────

function syncSkill(name) {
  const srcFile = join(PLUGIN_DIR, "skills", name, "SKILL.md");
  if (!existsSync(srcFile)) {
    console.log(`  [warn] plugin/skills/${name}/SKILL.md not found, skipping`);
    return null;
  }

  const content = readFileSync(srcFile, "utf-8");
  const { meta, body } = parseFrontmatter(content);

  // Codex frontmatter: only name + description (strip model, context, agent)
  const codexFrontmatter = [
    "---",
    `name: ${meta.name || name}`,
    `description: ${meta.description || ""}`,
    "---",
  ].join("\n");

  const outDir = join(CODEX_DIR, "skills", name);

  return {
    name,
    outPath: join(outDir, "SKILL.md"),
    outDir,
    content: codexFrontmatter + "\n" + body,
  };
}

// ── Write helper ─────────────────────────────────────────────────────

function writeIfChanged(item) {
  if (!item) return false;

  const existing = existsSync(item.outPath) ? readFileSync(item.outPath, "utf-8") : "";
  if (existing === item.content) {
    console.log(`  [skip] ${item.name} (unchanged)`);
    return false;
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] ${item.name} → ${item.outPath}`);
  } else {
    mkdirSync(dirname(item.outPath), { recursive: true });
    writeFileSync(item.outPath, item.content, "utf-8");
    console.log(`  [write] ${item.name} → ${item.outPath}`);
  }
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────

function main() {
  let changed = 0;
  let total = 0;

  console.log("Agents:");
  for (const name of AGENT_LIST) {
    total++;
    if (writeIfChanged(syncAgent(name))) changed++;
  }

  console.log("\nSkills:");
  for (const name of SKILL_LIST) {
    total++;
    if (writeIfChanged(syncSkill(name))) changed++;
  }

  console.log(
    `\nDone. ${changed} file(s) ${DRY_RUN ? "would change" : "changed"}, ${total - changed} unchanged.`,
  );
}

main();
