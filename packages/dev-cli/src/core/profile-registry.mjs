import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCliError } from "./recipe-utils.mjs";
import {
  assertProfileVersion,
  createProfileRef,
  extractMajorProfileVersion,
  isExactProfileVersion
} from "./version-utils.mjs";

const DEFAULT_PROFILE_REPOSITORY = "SeoJaeWan/try-claude-code";
const DEFAULT_PROFILE_REGISTRY_URL = `https://raw.githubusercontent.com/${DEFAULT_PROFILE_REPOSITORY}/main/profiles/registry.json`;
const DEFAULT_PROFILE_RAW_BASE_URL = `https://raw.githubusercontent.com/${DEFAULT_PROFILE_REPOSITORY}/{ref}`;
const DEFAULT_PROFILE_CACHE_DIR = path.join(
  os.homedir(),
  ".try-claude-dev-cli-cache",
  "profiles"
);

function getProfileRegistryUrl() {
  return process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL ?? DEFAULT_PROFILE_REGISTRY_URL;
}

function getProfileRawBaseUrl() {
  return process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL ?? DEFAULT_PROFILE_RAW_BASE_URL;
}

function getProfileCacheDir() {
  return process.env.TRY_CLAUDE_PROFILE_CACHE_DIR ?? DEFAULT_PROFILE_CACHE_DIR;
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRegistryCachePath() {
  return path.join(getProfileCacheDir(), "registry.json");
}

function getPinnedCachePath(resolvedRef, relativePath) {
  return path.join(
    getProfileCacheDir(),
    resolvedRef,
    ...relativePath.split("/").filter(Boolean)
  );
}

function buildPinnedResourceUrl(resolvedRef, relativePath) {
  const rawBaseUrl = getProfileRawBaseUrl();
  const normalizedRelativePath = relativePath.replace(/^\/+/, "");

  if (rawBaseUrl.includes("{ref}")) {
    const baseUrl = rawBaseUrl.replaceAll("{ref}", resolvedRef);
    return new URL(normalizedRelativePath, ensureTrailingSlash(baseUrl)).href;
  }

  if (rawBaseUrl.startsWith("file:")) {
    return new URL(normalizedRelativePath, ensureTrailingSlash(rawBaseUrl)).href;
  }

  const baseUrl = `${rawBaseUrl.replace(/\/+$/, "")}/${resolvedRef}`;
  return new URL(normalizedRelativePath, ensureTrailingSlash(baseUrl)).href;
}

async function writeCacheFile(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function readResourceText(url) {
  if (url.startsWith("file:")) {
    return readFile(fileURLToPath(url), "utf8");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function readMutableJson(url, cachePath) {
  try {
    const content = await readResourceText(url);
    if (cachePath) {
      await writeCacheFile(cachePath, content);
    }
    return content;
  } catch (error) {
    if (cachePath && existsSync(cachePath)) {
      return readFile(cachePath, "utf8");
    }

    throw error;
  }
}

function createDefaultResolvedRef(resolvedVersion) {
  return createProfileRef({
    resolvedVersion
  });
}

function assertExactReleaseVersion(value, field) {
  const version = assertProfileVersion(value, field);

  if (isExactProfileVersion(version)) {
    return version;
  }

  throw createCliError(
    "INVALID_PROFILE_REGISTRY",
    `Profile registry ${field} must use an exact version like v1.0.0.`,
    {
      field,
      value
    }
  );
}

function getChannelRegistryEntry(registry, role, mode, majorVersion) {
  return registry?.[role]?.[mode]?.[majorVersion] ?? null;
}

function normalizeVersionCatalog(versions, latestVersion) {
  if (versions == null) {
    return latestVersion ? { [latestVersion]: {} } : {};
  }

  if (Array.isArray(versions)) {
    return Object.fromEntries(
      versions.map((value) => [
        assertExactReleaseVersion(value, "versions"),
        {}
      ])
    );
  }

  if (!isPlainObject(versions)) {
    throw createCliError(
      "INVALID_PROFILE_REGISTRY",
      "Profile registry versions must be an object or array.",
      {
        versions
      }
    );
  }

  return Object.fromEntries(
    Object.entries(versions).map(([version, value]) => {
      const normalizedVersion = assertExactReleaseVersion(version, "versions");

      if (typeof value === "string") {
        return [normalizedVersion, { ref: value.trim() }];
      }

      if (value == null) {
        return [normalizedVersion, {}];
      }

      if (!isPlainObject(value)) {
        throw createCliError(
          "INVALID_PROFILE_REGISTRY",
          `Profile registry version entry must be an object, string, or null: ${version}`,
          {
            version,
            value
          }
        );
      }

      return [normalizedVersion, value];
    })
  );
}

function resolveVersionRef(resolvedVersion, versionEntry = {}) {
  if (typeof versionEntry === "string" && versionEntry.trim().length > 0) {
    return versionEntry.trim();
  }

  if (isPlainObject(versionEntry) && typeof versionEntry.ref === "string" && versionEntry.ref.trim().length > 0) {
    return versionEntry.ref.trim();
  }

  return createDefaultResolvedRef(resolvedVersion);
}

function normalizeRegistryChannel(role, mode, majorVersion, entry) {
  if (!entry || typeof entry !== "object") {
    throw createCliError(
      "INVALID_PROFILE_REGISTRY",
      `Missing registry entry for ${role}/${mode}/${majorVersion}`,
      {
        role,
        mode,
        version: majorVersion
      }
    );
  }

  if ("resolvedVersion" in entry) {
    const resolvedVersion = assertExactReleaseVersion(
      entry.resolvedVersion,
      "resolvedVersion"
    );

    return {
      latestVersion: resolvedVersion,
      versions: {
        [resolvedVersion]: {
          ...(typeof entry.ref === "string" && entry.ref.trim().length > 0
            ? {
                ref: entry.ref.trim()
              }
            : {})
        }
      }
    };
  }

  const latestVersion = assertExactReleaseVersion(entry.latest, "latest");
  const versions = normalizeVersionCatalog(entry.versions, latestVersion);

  if (!(latestVersion in versions)) {
    versions[latestVersion] = {};
  }

  return {
    latestVersion,
    versions
  };
}

function resolveChannelVersion(channel, resolvedVersion) {
  return {
    resolvedVersion,
    resolvedRef: resolveVersionRef(
      resolvedVersion,
      channel?.versions?.[resolvedVersion]
    )
  };
}

async function tryResolveExactVersion(role, mode, majorVersion, requestedVersion) {
  try {
    const registry = await loadProfileRegistry();
    const channelEntry = getChannelRegistryEntry(registry, role, mode, majorVersion);

    if (!channelEntry) {
      return {
        resolvedVersion: requestedVersion,
        resolvedRef: createDefaultResolvedRef(requestedVersion)
      };
    }

    const channel = normalizeRegistryChannel(role, mode, majorVersion, channelEntry);
    return resolveChannelVersion(channel, requestedVersion);
  } catch {
    return {
      resolvedVersion: requestedVersion,
      resolvedRef: createDefaultResolvedRef(requestedVersion)
    };
  }
}

export async function loadProfileRegistry() {
  const registryUrl = getProfileRegistryUrl();
  const cachePath = registryUrl.startsWith("file:") ? null : getRegistryCachePath();

  try {
    const content = await readMutableJson(registryUrl, cachePath);
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createCliError(
        "INVALID_PROFILE_REGISTRY",
        "Profile registry JSON is invalid.",
        {
          registryUrl
        }
      );
    }

    throw createCliError(
      "PROFILE_REGISTRY_UNAVAILABLE",
      "Profile registry could not be loaded.",
      {
        registryUrl,
        cause: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

export async function hydrateProfileSelection({
  role,
  selection,
  forceRefresh = false
}) {
  const mode = selection.mode ?? "personal";
  const requestedVersion = assertProfileVersion(
    selection.requestedVersion ?? selection.version ?? "v1"
  );
  const majorVersion = extractMajorProfileVersion(requestedVersion);

  if (!majorVersion) {
    throw createCliError(
      "INVALID_PROFILE_VERSION",
      `Could not determine major profile version from ${requestedVersion}`,
      {
        requestedVersion
      }
    );
  }

  if (isExactProfileVersion(requestedVersion)) {
    if (
      !forceRefresh &&
      selection.resolvedVersion === requestedVersion &&
      selection.resolvedRef
    ) {
      return {
        ...selection,
        mode,
        version: requestedVersion,
        requestedVersion,
        majorVersion,
        resolvedVersion: requestedVersion,
        resolvedRef: selection.resolvedRef
      };
    }

    const exactVersion = await tryResolveExactVersion(
      role,
      mode,
      majorVersion,
      requestedVersion
    );

    return {
      ...selection,
      mode,
      version: requestedVersion,
      requestedVersion,
      majorVersion,
      resolvedVersion: exactVersion.resolvedVersion,
      resolvedRef: exactVersion.resolvedRef
    };
  }

  if (!forceRefresh && selection.resolvedVersion && selection.resolvedRef) {
    return {
      ...selection,
      mode,
      version: requestedVersion,
      requestedVersion,
      majorVersion,
      resolvedVersion: selection.resolvedVersion,
      resolvedRef: selection.resolvedRef
    };
  }

  const registry = await loadProfileRegistry();
  const channel = normalizeRegistryChannel(
    role,
    mode,
    majorVersion,
    getChannelRegistryEntry(registry, role, mode, majorVersion)
  );
  const entry = resolveChannelVersion(channel, channel.latestVersion);

  return {
    ...selection,
    mode,
    version: requestedVersion,
    requestedVersion,
    majorVersion,
    resolvedVersion: entry.resolvedVersion,
    resolvedRef: entry.resolvedRef
  };
}

export async function ensurePinnedResourceFile({
  resolvedRef,
  relativePath
}) {
  const url = buildPinnedResourceUrl(resolvedRef, relativePath);

  if (url.startsWith("file:")) {
    return fileURLToPath(url);
  }

  const cachePath = getPinnedCachePath(resolvedRef, relativePath);
  if (existsSync(cachePath)) {
    return cachePath;
  }

  try {
    const content = await readResourceText(url);
    await writeCacheFile(cachePath, content);
    return cachePath;
  } catch (error) {
    if (existsSync(cachePath)) {
      return cachePath;
    }

    throw createCliError(
      "PROFILE_FETCH_FAILED",
      `Profile resource could not be loaded: ${relativePath}`,
      {
        resolvedRef,
        relativePath,
        url,
        cause: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

export async function readPinnedJsonResource({
  resolvedRef,
  relativePath
}) {
  const filePath = await ensurePinnedResourceFile({
    resolvedRef,
    relativePath
  });

  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createCliError(
        "INVALID_PROFILE_RESOURCE",
        `Invalid JSON resource: ${relativePath}`,
        {
          resolvedRef,
          relativePath
        }
      );
    }

    throw error;
  }
}
