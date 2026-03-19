import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { extractMajorProfileVersion } from "./version-utils.mjs";

const CONFIG_FILE = ".try-claude-dev-cli.json";

async function readJsonFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getGlobalConfigPath() {
  return path.join(os.homedir(), CONFIG_FILE);
}

export async function readGlobalConfig() {
  return readJsonFile(getGlobalConfigPath());
}

function normalizeStoredSelection(selection) {
  if (!selection?.mode) {
    return null;
  }

  const rawVersion =
    selection.version ??
    selection.requestedVersion ??
    selection.resolvedVersion ??
    null;
  const version = extractMajorProfileVersion(rawVersion);

  if (!version) {
    return null;
  }

  return {
    mode: selection.mode,
    version
  };
}

export function getProfileSelection(config, alias) {
  return normalizeStoredSelection(config?.profiles?.[alias] ?? null);
}

export async function writeProfileSelection({
  alias,
  mode,
  version
}) {
  const filePath = getGlobalConfigPath();
  const current = await readJsonFile(filePath);
  const next = {
    ...current,
    profiles: {
      ...(current.profiles ?? {}),
      [alias]: {
        mode,
        version
      }
    }
  };

  await writeJsonFile(filePath, next);

  return {
    scope: "global",
    filePath,
    alias,
    mode,
    version
  };
}
