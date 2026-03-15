import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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

export function getGlobalConfigPath() {
  return path.join(os.homedir(), CONFIG_FILE);
}

export function getRepoConfigPath(repoRoot) {
  return path.join(repoRoot, CONFIG_FILE);
}

export async function readConfig(filePath) {
  return readJsonFile(filePath);
}

export async function readConfigs(repoRoot) {
  const [globalConfig, repoConfig] = await Promise.all([
    readJsonFile(getGlobalConfigPath()),
    readJsonFile(getRepoConfigPath(repoRoot))
  ]);

  return {
    globalConfig,
    repoConfig
  };
}

export function getProfileSelection(config, role) {
  return config?.profiles?.[role] ?? null;
}

export async function writeProfileSelection({
  scope,
  repoRoot,
  role,
  mode,
  version
}) {
  const filePath =
    scope === "repo" ? getRepoConfigPath(repoRoot) : getGlobalConfigPath();
  const current = await readJsonFile(filePath);
  const next = {
    ...current,
    profiles: {
      ...(current.profiles ?? {}),
      [role]: {
        mode,
        version
      }
    }
  };

  await writeJsonFile(filePath, next);

  return {
    scope,
    filePath,
    role,
    mode,
    version
  };
}
