import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CACHE_ROOT_DIR = ".try-claude-dev-cli-cache";

function getCacheRootPath() {
  return path.join(os.homedir(), CACHE_ROOT_DIR);
}

export function getCachedProfileSnapshotPath({
  alias,
  mode,
  version
}) {
  return path.join(
    getCacheRootPath(),
    "profiles",
    alias,
    mode,
    version,
    "profile.json"
  );
}

function normalizeCachedProfileSnapshot(entry) {
  if (entry?.profile && typeof entry.profile === "object" && !Array.isArray(entry.profile)) {
    return entry.profile;
  }

  if (entry && typeof entry === "object" && !Array.isArray(entry) && entry.commands) {
    return entry;
  }

  return null;
}

export async function readCachedProfileSnapshot({
  alias,
  mode,
  version
}) {
  const filePath = getCachedProfileSnapshotPath({
    alias,
    mode,
    version
  });

  try {
    const content = await readFile(filePath, "utf8");
    return normalizeCachedProfileSnapshot(JSON.parse(content));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeCachedProfileSnapshot({
  alias,
  mode,
  version,
  profile
}) {
  const filePath = getCachedProfileSnapshotPath({
    alias,
    mode,
    version
  });

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify({
      cachedAt: new Date().toISOString(),
      profile
    }, null, 2)}\n`,
    "utf8"
  );

  return {
    scope: "global-cache",
    filePath,
    alias,
    mode,
    version
  };
}
