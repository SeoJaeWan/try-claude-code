import { createHash } from 'node:crypto';
import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { accessSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const PLUGIN_ID = 'try-claude';
export const SCHEMA_VERSION = '1.0.0';
export const RUNTIME_ROOT = '.claude/try-claude';
export const RUNTIME_SUBDIRS = [
  'references',
  'plans',
  'reports',
  'logs',
  'codemaps',
  'humanmaps',
  'jira-review',
];

const PREAMBLE_KEY = '__preamble__';
const SECTION_HEADING_PATTERN = /^##\s+(.+?)\s*$/gm;

export const normalizePath = (value) => value.replace(/\\/g, '/');

export const joinNormalized = (...segments) => normalizePath(join(...segments));

export const resolveRuntimeRoot = (repoRoot) =>
  joinNormalized(resolve(repoRoot), RUNTIME_ROOT);

export const computeHash = (content) =>
  createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');

export const loadPluginMeta = async (pluginRoot) => {
  const marketplacePath = join(pluginRoot, '.claude-plugin', 'marketplace.json');
  const marketplace = JSON.parse(await readFile(marketplacePath, 'utf8'));
  return {
    pluginId: marketplace.name || PLUGIN_ID,
    pluginVersion: marketplace.metadata?.version || '0.1.0',
    pluginRoot: normalizePath(resolve(pluginRoot)),
  };
};

export const exists = (targetPath) => {
  try {
    accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const ensureDir = async (targetPath) => {
  await mkdir(targetPath, { recursive: true });
};

export const ensureRuntimeDirs = async (repoRoot) => {
  const runtimeRoot = resolveRuntimeRoot(repoRoot);
  await ensureDir(runtimeRoot);

  for (const dir of RUNTIME_SUBDIRS) {
    await ensureDir(join(runtimeRoot, dir));
  }

  return runtimeRoot;
};

const walkRelativeFiles = async (rootPath, basePath = rootPath) => {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkRelativeFiles(absolutePath, basePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(normalizePath(absolutePath.slice(basePath.length + 1)));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
};

export const listPluginReferenceFiles = async (pluginRoot) => {
  const referencesRoot = join(pluginRoot, 'references');
  if (!exists(referencesRoot)) {
    return [];
  }

  const files = await walkRelativeFiles(referencesRoot);
  return files.map((relativePath) => joinNormalized('references', relativePath));
};

export const readText = async (targetPath) => readFile(targetPath, 'utf8');

export const writeText = async (targetPath, content) => {
  await ensureDir(dirname(targetPath));
  await writeFile(targetPath, content, 'utf8');
};

export const parseMarkdownSections = (content) => {
  const normalized = content.replace(/\r\n/g, '\n');
  const matches = [...normalized.matchAll(SECTION_HEADING_PATTERN)];

  if (matches.length === 0) {
    return { valid: false, reason: 'no-sections' };
  }

  const preamble = normalized.slice(0, matches[0].index ?? 0);
  const sections = [];
  const sectionMap = new Map();
  const seen = new Set();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const key = (match[1] || '').trim();

    if (!key) {
      return { valid: false, reason: 'empty-heading' };
    }

    if (seen.has(key)) {
      return { valid: false, reason: 'duplicate-heading' };
    }

    seen.add(key);

    const start = match.index ?? 0;
    const end = index + 1 < matches.length
      ? matches[index + 1].index ?? normalized.length
      : normalized.length;
    const section = {
      key,
      content: normalized.slice(start, end),
    };

    sections.push(section);
    sectionMap.set(key, section);
  }

  return {
    valid: true,
    preamble,
    sections,
    sectionMap,
  };
};

const computeSectionHashes = (parsed) => {
  if (!parsed.valid) {
    return {};
  }

  const hashes = {
    [PREAMBLE_KEY]: computeHash(parsed.preamble || ''),
  };

  for (const section of parsed.sections || []) {
    hashes[section.key] = computeHash(section.content);
  }

  return hashes;
};

export const computeTrackedSectionHashes = ({ pluginContent, currentContent }) => {
  const pluginParsed = parseMarkdownSections(pluginContent);
  const currentParsed = parseMarkdownSections(currentContent);

  if (!pluginParsed.valid || !currentParsed.valid) {
    return null;
  }

  const tracked = {};
  const pluginHashes = computeSectionHashes(pluginParsed);
  const currentHashes = computeSectionHashes(currentParsed);

  if (pluginHashes[PREAMBLE_KEY] === currentHashes[PREAMBLE_KEY]) {
    tracked[PREAMBLE_KEY] = pluginHashes[PREAMBLE_KEY];
  }

  for (const section of pluginParsed.sections || []) {
    if (currentHashes[section.key] === pluginHashes[section.key]) {
      tracked[section.key] = pluginHashes[section.key];
    }
  }

  return tracked;
};

const appendBlock = (base, block) => {
  if (!base) {
    return block;
  }

  if (base.endsWith('\n') || block.startsWith('\n')) {
    return `${base}${block}`;
  }

  return `${base}\n${block}`;
};

export const mergeMarkdownSections = ({
  pluginContent,
  currentContent,
  recordedSectionHashes = {},
}) => {
  const pluginParsed = parseMarkdownSections(pluginContent);
  const currentParsed = parseMarkdownSections(currentContent);

  if (!pluginParsed.valid || !currentParsed.valid) {
    return {
      valid: false,
      reason: !pluginParsed.valid ? pluginParsed.reason : currentParsed.reason,
    };
  }

  const currentHashes = computeSectionHashes(currentParsed);
  const mergedSections = [];
  const seenPluginKeys = new Set();

  let mergedPreamble = currentParsed.preamble || '';
  if (
    recordedSectionHashes[PREAMBLE_KEY] &&
    currentHashes[PREAMBLE_KEY] === recordedSectionHashes[PREAMBLE_KEY]
  ) {
    mergedPreamble = pluginParsed.preamble || '';
  }

  for (const currentSection of currentParsed.sections || []) {
    const pluginSection = pluginParsed.sectionMap?.get(currentSection.key);

    if (!pluginSection) {
      mergedSections.push(currentSection.content);
      continue;
    }

    seenPluginKeys.add(currentSection.key);
    const recordedHash = recordedSectionHashes[currentSection.key];
    const currentHash = currentHashes[currentSection.key];

    if (recordedHash && currentHash === recordedHash) {
      mergedSections.push(pluginSection.content);
    } else {
      mergedSections.push(currentSection.content);
    }
  }

  for (const pluginSection of pluginParsed.sections || []) {
    if (!seenPluginKeys.has(pluginSection.key)) {
      mergedSections.push(pluginSection.content);
    }
  }

  let mergedContent = mergedPreamble;
  for (const sectionContent of mergedSections) {
    mergedContent = appendBlock(mergedContent, sectionContent);
  }

  return {
    valid: true,
    mergedContent,
    changed: computeHash(mergedContent) !== computeHash(currentContent),
    updatedSectionHashes: computeTrackedSectionHashes({
      pluginContent,
      currentContent: mergedContent,
    }) || {},
  };
};

export const createProjectState = ({ pluginId, pluginVersion, managedReferences, now }) => ({
  schemaVersion: SCHEMA_VERSION,
  pluginId,
  pluginVersion,
  lastSyncedAt: now,
  managedReferences,
});

export const buildManagedReferenceEntry = ({
  relativePath,
  currentContent,
  pluginContent,
  now,
}) => {
  const hash = computeHash(currentContent);
  const sectionHashes = computeTrackedSectionHashes({
    pluginContent,
    currentContent,
  });

  if (sectionHashes) {
    return {
      path: relativePath,
      hash,
      mergeMode: 'markdown-sections',
      sectionHashes,
      lastSyncedAt: now,
    };
  }

  if (hash === computeHash(pluginContent)) {
    return {
      path: relativePath,
      hash,
      mergeMode: 'whole-file',
      sectionHashes: {},
      lastSyncedAt: now,
    };
  }

  return null;
};

export const loadProjectState = async (repoRoot) => {
  const projectJsonPath = join(resolveRuntimeRoot(repoRoot), 'project.json');
  if (!exists(projectJsonPath)) {
    return null;
  }

  const raw = await readText(projectJsonPath);
  const parsed = JSON.parse(raw);

  return {
    projectJsonPath,
    state: parsed,
  };
};

export const writeProjectState = async (repoRoot, state) => {
  const projectJsonPath = join(resolveRuntimeRoot(repoRoot), 'project.json');
  await writeText(projectJsonPath, JSON.stringify(state, null, 2));
  return projectJsonPath;
};
