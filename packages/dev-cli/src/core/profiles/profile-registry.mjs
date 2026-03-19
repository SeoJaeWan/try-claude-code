import { createCliError } from "../shared/recipe-utils.mjs";
import { assertProfileVersion } from "./version-utils.mjs";

const DEFAULT_PROFILE_REPOSITORY = "SeoJaeWan/try-claude-code";
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

function assertProfileMode(value, field = "mode") {
  if (typeof value !== "string" || value.trim() === "") {
    throw createCliError(
      "INVALID_PROFILE_MODE",
      `Invalid ${field}: ${value}. Use simple mode names like personal.`,
      {
        field,
        value
      }
    );
  }

  const normalized = value.trim();
  if (/[\/@]/.test(normalized)) {
    throw createCliError(
      "INVALID_PROFILE_MODE",
      `Invalid ${field}: ${value}. Use --mode personal --version v1.`,
      {
        field,
        value
      }
    );
  }

  return normalized;
}

export async function hydrateProfileSelection({
  selection
}) {
  const mode = assertProfileMode(selection.mode ?? "personal");
  const version = assertProfileVersion(
    selection.version ?? selection.requestedVersion ?? "v1"
  );

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
