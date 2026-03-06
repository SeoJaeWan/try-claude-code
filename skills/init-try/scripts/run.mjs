import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManagedReferenceEntry,
  createProjectState,
  ensureRuntimeDirs,
  exists,
  joinNormalized,
  listPluginReferenceFiles,
  loadPluginMeta,
  readText,
  writeProjectState,
  writeText,
} from './runtime-state.mjs';

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

export const runInitTry = async ({ repoRoot, pluginRoot }) => {
  const resolvedRepoRoot = resolve(repoRoot);
  const resolvedPluginRoot = pluginRoot
    ? resolve(pluginRoot)
    : resolve(fileURLToPath(new URL('../../../', import.meta.url)));
  const pluginMeta = await loadPluginMeta(resolvedPluginRoot);
  const runtimeRoot = await ensureRuntimeDirs(resolvedRepoRoot);
  const referencePaths = await listPluginReferenceFiles(resolvedPluginRoot);
  const managedReferences = [];
  const seeded = [];
  const kept = [];
  const now = new Date().toISOString();

  for (const relativePath of referencePaths) {
    const pluginPath = join(resolvedPluginRoot, relativePath);
    const runtimePath = join(runtimeRoot, relativePath);
    const pluginContent = await readText(pluginPath);

    if (!exists(runtimePath)) {
      await writeText(runtimePath, pluginContent);
      seeded.push(relativePath);
    } else {
      kept.push(relativePath);
    }

    const currentContent = await readText(runtimePath);
    const managedEntry = buildManagedReferenceEntry({
      relativePath,
      currentContent,
      pluginContent,
      now,
    });

    if (managedEntry) {
      managedReferences.push(managedEntry);
    }
  }

  const state = createProjectState({
    pluginId: pluginMeta.pluginId,
    pluginVersion: pluginMeta.pluginVersion,
    managedReferences: managedReferences.sort((left, right) => left.path.localeCompare(right.path)),
    now,
  });

  const projectJsonPath = await writeProjectState(resolvedRepoRoot, state);

  return {
    status: 'ok',
    runtimeRoot: joinNormalized(resolvedRepoRoot, '.claude/try-claude'),
    seededCount: seeded.length,
    keptCount: kept.length,
    trackedCount: state.managedReferences.length,
    projectJsonPath: joinNormalized(projectJsonPath),
    seeded,
    kept,
  };
};

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  runInitTry(parseArgs())
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({ status: 'error', message: error.message }, null, 2)}\n`);
      process.exit(1);
    });
}
