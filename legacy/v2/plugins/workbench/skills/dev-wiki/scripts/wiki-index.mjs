#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function hasFlag(name) {
  return args.includes(name);
}

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const mode = argValue("--mode", "plan");
const rootArg = argValue("--root");
const outArg = argValue("--out");

if (hasFlag("--help") || hasFlag("-h")) {
  console.error("Usage: node <dev-wiki-skill-dir>/scripts/wiki-index.mjs --mode plan|dev --root <wiki-root> [--out <generated-dir>]");
  process.exit(0);
}

if (!rootArg) {
  console.error("Usage: node <dev-wiki-skill-dir>/scripts/wiki-index.mjs --mode plan|dev --root <wiki-root> [--out <generated-dir>]");
  process.exit(2);
}

const root = path.resolve(rootArg);
const generatedRoot = path.resolve(outArg ?? path.join(root, "generated"));

const ignoredDirs = new Set([
  ".git",
  ".obsidian",
  "node_modules",
  "generated",
  "_generated",
  "dist",
  "build",
  ".next",
  "coverage",
]);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, predicate = (entry) => entry.isFile() && entry.name.endsWith(".md")) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full, predicate));
    } else if (predicate(entry)) {
      files.push(full);
    }
  }
  return files.sort();
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => parseScalar(part));
  }
  return trimmed;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { data: {}, body: text };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: text };
  const raw = text.slice(4, end).trimEnd();
  const data = {};
  let currentKey = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(parseScalar(listMatch[1]));
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;
    currentKey = keyMatch[1];
    data[currentKey] = keyMatch[2] === "" ? [] : parseScalar(keyMatch[2]);
  }
  return { data, body: text.slice(end + 4) };
}

function asArray(value) {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function titleFrom(body, relativePath) {
  const heading = body.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(relativePath, ".md");
}

function collectLinks(body) {
  const links = new Set();
  const wiki = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  const md = /\[[^\]]+\]\((?!https?:\/\/|mailto:)([^)#]+)(?:#[^)]+)?\)/g;
  for (const match of body.matchAll(wiki)) links.add(match[1].trim());
  for (const match of body.matchAll(md)) links.add(match[1].trim());
  return [...links].sort();
}

function addToIndex(index, key, relativePath) {
  if (!key) return;
  const text = String(key);
  if (!index[text]) index[text] = [];
  index[text].push(relativePath);
}

function sortObjectLists(object) {
  return Object.fromEntries(
    Object.entries(object)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => [key, [...new Set(values)].sort()])
  );
}

function possibleDrift(values) {
  const groups = new Map();
  for (const value of values) {
    const normalized = value.toLowerCase().replace(/[\s_-]+/g, "");
    if (!groups.has(normalized)) groups.set(normalized, []);
    groups.get(normalized).push(value);
  }
  return [...groups.values()].filter((group) => new Set(group).size > 1);
}

function markdownList(items) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- 없음";
}

function sectionIndex(title, index) {
  const lines = [`## ${title}`, ""];
  const entries = Object.entries(index);
  if (!entries.length) {
    lines.push("- 없음");
    return lines.join("\n");
  }
  for (const [key, files] of entries) {
    lines.push(`### \`${key}\``);
    lines.push("");
    for (const file of files) lines.push(`- [${file}](../${file})`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

const markdownFiles = await walk(root);
const allFiles = await walk(root, (entry) => entry.isFile());
const documents = [];
const byType = {};
const byTag = {};
const byStage = {};
const byRisk = {};
const byDomain = {};
const linkGraph = {};
const health = {
  missingType: [],
  missingFrontmatter: [],
  brokenLinks: [],
  oneOffTags: [],
  tagDrift: [],
};

const knownMarkdown = new Set(markdownFiles.map((file) => path.relative(root, file).replaceAll(path.sep, "/")));
const knownFiles = new Set(allFiles.map((file) => path.relative(root, file).replaceAll(path.sep, "/")));

if (mode === "plan") {
  const sourceRoot = path.basename(root) === "wiki" ? path.dirname(root) : root;
  const rawRoot = path.join(sourceRoot, "raw");
  if (await exists(rawRoot)) {
    const rawMarkdown = await walk(rawRoot);
    for (const file of rawMarkdown) {
      const relativePath = path.relative(sourceRoot, file).replaceAll(path.sep, "/");
      knownMarkdown.add(relativePath);
      knownFiles.add(relativePath);
    }
  }
}

for (const file of markdownFiles) {
  const text = await fs.readFile(file, "utf8");
  const relativePath = path.relative(root, file).replaceAll(path.sep, "/");
  const { data, body } = parseFrontmatter(text);
  const links = collectLinks(body);
  const document = {
    path: relativePath,
    title: data.title ?? titleFrom(body, relativePath),
    type: data.type ?? data.doc_type ?? null,
    stage: asArray(data.stage ?? data.stages),
    tags: asArray(data.tags),
    risk: asArray(data.risk ?? data.risks),
    domain: asArray(data.domain ?? data.domains),
    source: data.source ?? null,
    links,
  };
  documents.push(document);
  if (!text.startsWith("---\n")) health.missingFrontmatter.push(relativePath);
  if (!document.type) health.missingType.push(relativePath);
  addToIndex(byType, document.type, relativePath);
  for (const tag of document.tags) addToIndex(byTag, tag, relativePath);
  for (const stage of document.stage) addToIndex(byStage, stage, relativePath);
  for (const risk of document.risk) addToIndex(byRisk, risk, relativePath);
  for (const domain of document.domain) addToIndex(byDomain, domain, relativePath);
  linkGraph[relativePath] = links;

  for (const link of links) {
    if (link.startsWith("#")) continue;
    const candidates = [];
    const normalizedLink = link.replace(/^\.\//, "").replace(/^wiki\//, "");
    const relativeCandidate = path.normalize(path.join(path.dirname(relativePath), normalizedLink)).replaceAll(path.sep, "/");
    candidates.push(relativeCandidate);
    if (!relativeCandidate.endsWith(".md")) candidates.push(`${relativeCandidate}.md`);
    candidates.push(normalizedLink);
    if (!normalizedLink.endsWith(".md")) candidates.push(`${normalizedLink}.md`);
    if (link.endsWith(".md")) candidates.push(path.normalize(path.join(path.dirname(relativePath), link)).replaceAll(path.sep, "/"));
    const resolved = candidates.some((candidate) => {
      const clean = candidate.replace(/^\.\//, "");
      return knownMarkdown.has(clean) || knownFiles.has(clean);
    });
    if (!resolved) health.brokenLinks.push({ from: relativePath, link });
  }
}

const tagIndex = sortObjectLists(byTag);
for (const [tag, files] of Object.entries(tagIndex)) {
  if (files.length === 1) health.oneOffTags.push(tag);
}
health.tagDrift = possibleDrift(Object.keys(tagIndex));

const index = {
  generated_at: new Date().toISOString(),
  mode,
  root,
  document_count: documents.length,
  documents,
  indexes: {
    type: sortObjectLists(byType),
    tag: tagIndex,
    stage: sortObjectLists(byStage),
    risk: sortObjectLists(byRisk),
    domain: sortObjectLists(byDomain),
  },
  health,
};

await fs.mkdir(generatedRoot, { recursive: true });
await fs.writeFile(path.join(generatedRoot, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
await fs.writeFile(path.join(generatedRoot, "link-graph.json"), `${JSON.stringify({ generated_at: index.generated_at, links: linkGraph }, null, 2)}\n`);

const tagMarkdown = [
  "# Tag Index",
  "",
  `Generated: ${index.generated_at}`,
  "",
  sectionIndex("Tags", tagIndex),
  "",
].join("\n");
await fs.writeFile(path.join(generatedRoot, "tag-index.md"), tagMarkdown);

const healthMarkdown = [
  "# Wiki Health",
  "",
  `Generated: ${index.generated_at}`,
  "",
  "## Missing `type`",
  "",
  markdownList(health.missingType.map((file) => `\`${file}\``)),
  "",
  "## Missing Frontmatter",
  "",
  markdownList(health.missingFrontmatter.map((file) => `\`${file}\``)),
  "",
  "## Broken Links",
  "",
  markdownList(health.brokenLinks.map((item) => `\`${item.from}\` -> \`${item.link}\``)),
  "",
  "## One-off Tags",
  "",
  markdownList(health.oneOffTags.map((tag) => `\`${tag}\``)),
  "",
  "## Possible Tag Drift",
  "",
  markdownList(health.tagDrift.map((group) => group.map((tag) => `\`${tag}\``).join(", "))),
  "",
].join("\n");
await fs.writeFile(path.join(generatedRoot, "wiki-health.md"), healthMarkdown);

const proposalsMarkdown = [
  "# Normalize Proposals",
  "",
  `Generated: ${index.generated_at}`,
  "",
  "## Safe Automatic Changes",
  "",
  "- generated 산출물을 현재 스캔 결과로 갱신했습니다.",
  "",
  "## Needs Review",
  "",
  markdownList([
    ...health.tagDrift.map((group) => `태그 표기 후보: ${group.map((tag) => `\`${tag}\``).join(", ")}`),
    ...health.oneOffTags.map((tag) => `1회 사용 태그 검토: \`${tag}\``),
  ]),
  "",
].join("\n");
await fs.writeFile(path.join(generatedRoot, "normalize-proposals.md"), proposalsMarkdown);

console.log(`Indexed ${documents.length} markdown files into ${path.relative(process.cwd(), generatedRoot)}`);
