import { createCliError } from "./recipe-utils.mjs";
import { assertProfileVersion } from "./version-utils.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PROFILE_REPOSITORY = "SeoJaeWan/try-claude-code";
const DEFAULT_PROFILE_REGISTRY_URL = `https://raw.githubusercontent.com/${DEFAULT_PROFILE_REPOSITORY}/main/profiles/registry.json`;
const DEFAULT_PROFILE_RAW_BASE_URL = `https://raw.githubusercontent.com/${DEFAULT_PROFILE_REPOSITORY}/main/`;

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildRemoteResourceUrl(relativePath) {
  const normalizedRelativePath = relativePath.replace(/^\/+/, "");
  return new URL(normalizedRelativePath, ensureTrailingSlash(DEFAULT_PROFILE_RAW_BASE_URL)).href;
}

async function readResourceText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function getModeRegistryEntry(registry, role, mode) {
  return registry?.[role]?.[mode] ?? null;
}

function normalizeVersionCatalog(versions, role, mode) {
  if (!Array.isArray(versions)) {
    throw createCliError(
      "INVALID_PROFILE_REGISTRY",
      `Profile registry entry for ${role}/${mode} must be a version array.`,
      {
        role,
        mode,
        versions
      }
    );
  }

  const normalized = [
    ...new Set(
      versions.map((value) => assertProfileVersion(value, "version"))
    )
  ];

  if (normalized.length === 0) {
    throw createCliError(
      "INVALID_PROFILE_REGISTRY",
      `Profile registry entry for ${role}/${mode} must list at least one version.`,
      {
        role,
        mode
      }
    );
  }

  return normalized;
}

function normalizeRegistryMode(role, mode, entry) {
  if (!Array.isArray(entry)) {
    throw createCliError(
      "INVALID_PROFILE_REGISTRY",
      `Missing registry entry for ${role}/${mode}`,
      {
        role,
        mode
      }
    );
  }

  return normalizeVersionCatalog(entry, role, mode);
}

export async function loadProfileRegistry(localProfileRoot) {
  if (localProfileRoot) {
    const registryPath = path.join(localProfileRoot, "profiles", "registry.json");

    try {
      const content = await readFile(registryPath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw createCliError(
          "INVALID_PROFILE_REGISTRY",
          "Profile registry JSON is invalid.",
          {
            registryPath
          }
        );
      }

      throw createCliError(
        "PROFILE_REGISTRY_UNAVAILABLE",
        "Profile registry could not be loaded.",
        {
          registryPath,
          cause: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  try {
    const content = await readResourceText(DEFAULT_PROFILE_REGISTRY_URL);
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createCliError(
        "INVALID_PROFILE_REGISTRY",
        "Profile registry JSON is invalid.",
        {
          registryUrl: DEFAULT_PROFILE_REGISTRY_URL
        }
      );
    }

    throw createCliError(
      "PROFILE_REGISTRY_UNAVAILABLE",
      "Profile registry could not be loaded.",
      {
        registryUrl: DEFAULT_PROFILE_REGISTRY_URL,
        cause: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

export async function hydrateProfileSelection({
  role,
  selection,
  localProfileRoot
}) {
  const mode = selection.mode ?? "personal";
  const version = assertProfileVersion(
    selection.version ?? selection.requestedVersion ?? "v1"
  );

  const registry = await loadProfileRegistry(localProfileRoot);
  const availableVersions = normalizeRegistryMode(
    role,
    mode,
    getModeRegistryEntry(registry, role, mode)
  );

  if (!availableVersions.includes(version)) {
    throw createCliError(
      "PROFILE_VERSION_UNAVAILABLE",
      `Profile version ${version} is not available for ${role}/${mode}.`,
      {
        role,
        mode,
        version,
        availableVersions
      }
    );
  }

  return {
    ...selection,
    mode,
    version,
    majorVersion: version
  };
}

export async function readRemoteTextResource({
  relativePath
}) {
  const url = buildRemoteResourceUrl(relativePath);

  try {
    return await readResourceText(url);
  } catch (error) {
    throw createCliError(
      "PROFILE_FETCH_FAILED",
      `Profile resource could not be loaded: ${relativePath}`,
      {
        relativePath,
        url,
        cause: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

export async function readRemoteJsonResource({
  relativePath
}) {
  try {
    const content = await readRemoteTextResource({
      relativePath
    });
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createCliError(
        "INVALID_PROFILE_RESOURCE",
        `Invalid JSON resource: ${relativePath}`,
        {
          relativePath
        }
      );
    }

    throw error;
  }
}
