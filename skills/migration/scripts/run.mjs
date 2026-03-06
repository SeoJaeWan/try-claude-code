import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManagedReferenceEntry,
  computeHash,
  createProjectState,
  ensureRuntimeDirs,
  exists,
  joinNormalized,
  listPluginReferenceFiles,
  loadPluginMeta,
  loadProjectState,
  mergeMarkdownSections,
  readText,
  writeProjectState,
  writeText,
} from '../../init-try/scripts/runtime-state.mjs';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {
    repoRoot: process.cwd(),
    pluginRoot: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--repo-root' && args[index + 1]) {
      parsed.repoRoot = args[index + 1];
      index += 1;
    } else if (args[index] === '--plugin-root' && args[index + 1]) {
      parsed.pluginRoot = args[index + 1];
      index += 1;
    }
  }

  return parsed;
};

const sortEntries = (entries) =>
  entries.sort((left, right) => left.path.localeCompare(right.path));

export const runMigration = async ({ repoRoot, pluginRoot }) => {
  const resolvedRepoRoot = resolve(repoRoot);
  const resolvedPluginRoot = pluginRoot
    ? resolve(pluginRoot)
    : resolve(fileURLToPath(new URL('../../../', import.meta.url)));
  const runtimeRoot = await ensureRuntimeDirs(resolvedRepoRoot);
  const loadedState = await loadProjectState(resolvedRepoRoot);

  if (!loadedState?.state) {
    throw new Error('Missing .claude/try-claude/project.json. Run init-try first.');
  }

  const pluginMeta = await loadPluginMeta(resolvedPluginRoot);
  const pluginReferencePaths = await listPluginReferenceFiles(resolvedPluginRoot);
  const existingEntries = new Map(
    (loadedState.state.managedReferences || []).map((entry) => [entry.path, entry])
  );
  const updatedEntries = [];
  const carriedEntries = [];
  const actions = [];
  const now = new Date().toISOString();

  for (const relativePath of pluginReferencePaths) {
    const pluginPath = join(resolvedPluginRoot, relativePath);
    const runtimePath = join(runtimeRoot, relativePath);
    const pluginContent = await readText(pluginPath);
    const existingEntry = existingEntries.get(relativePath);

    if (!exists(runtimePath)) {
      await writeText(runtimePath, pluginContent);
      const newEntry = buildManagedReferenceEntry({
        relativePath,
        currentContent: pluginContent,
        pluginContent,
        now,
      });

      if (newEntry) {
        updatedEntries.push(newEntry);
      }

      actions.push({ path: relativePath, action: 'reseeded' });
      existingEntries.delete(relativePath);
      continue;
    }

    const currentContent = await readText(runtimePath);

    if (!existingEntry) {
      const trackableEntry = buildManagedReferenceEntry({
        relativePath,
        currentContent,
        pluginContent,
        now,
      });

      if (trackableEntry) {
        updatedEntries.push(trackableEntry);
        actions.push({ path: relativePath, action: 'tracked-existing' });
      } else {
        actions.push({ path: relativePath, action: 'skipped', reason: 'user-modified-untracked' });
      }

      continue;
    }

    existingEntries.delete(relativePath);

    if (existingEntry.mergeMode === 'markdown-sections') {
      const merged = mergeMarkdownSections({
        pluginContent,
        currentContent,
        recordedSectionHashes: existingEntry.sectionHashes || {},
      });

      if (merged.valid) {
        const nextContent = merged.changed ? merged.mergedContent : currentContent;

        if (merged.changed) {
          await writeText(runtimePath, merged.mergedContent);
          actions.push({ path: relativePath, action: 'updated' });
        } else {
          actions.push({ path: relativePath, action: 'no-change' });
        }

        const nextEntry = buildManagedReferenceEntry({
          relativePath,
          currentContent: nextContent,
          pluginContent,
          now,
        });

        if (nextEntry) {
          updatedEntries.push(nextEntry);
        }
        continue;
      }
    }

    const currentHash = computeHash(currentContent);
    const pluginHash = computeHash(pluginContent);

    if (currentHash !== existingEntry.hash) {
      carriedEntries.push(existingEntry);
      actions.push({ path: relativePath, action: 'skipped', reason: 'user-modified' });
      continue;
    }

    if (currentHash !== pluginHash) {
      await writeText(runtimePath, pluginContent);
      const nextEntry = buildManagedReferenceEntry({
        relativePath,
        currentContent: pluginContent,
        pluginContent,
        now,
      });

      if (nextEntry) {
        updatedEntries.push(nextEntry);
      }

      actions.push({ path: relativePath, action: 'updated' });
      continue;
    }

    const stableEntry = buildManagedReferenceEntry({
      relativePath,
      currentContent,
      pluginContent,
      now,
    });

    if (stableEntry) {
      updatedEntries.push(stableEntry);
    } else {
      carriedEntries.push(existingEntry);
    }

    actions.push({ path: relativePath, action: 'no-change' });
  }

  for (const staleEntry of existingEntries.values()) {
    carriedEntries.push(staleEntry);
  }

  const nextState = createProjectState({
    pluginId: pluginMeta.pluginId,
    pluginVersion: pluginMeta.pluginVersion,
    managedReferences: sortEntries([...updatedEntries, ...carriedEntries]),
    now,
  });

  const projectJsonPath = await writeProjectState(resolvedRepoRoot, nextState);

  return {
    status: 'ok',
    runtimeRoot: joinNormalized(resolvedRepoRoot, '.claude/try-claude'),
    updatedCount: actions.filter((action) => action.action === 'updated').length,
    reseededCount: actions.filter((action) => action.action === 'reseeded').length,
    skippedCount: actions.filter((action) => action.action === 'skipped').length,
    trackedCount: nextState.managedReferences.length,
    projectJsonPath: joinNormalized(projectJsonPath),
    actions,
  };
};

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration(parseArgs())
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({ status: 'error', message: error.message }, null, 2)}\n`);
      process.exit(1);
    });
}
