import { createCliError } from "../shared/recipe-utils.mjs";

const MAJOR_PROFILE_VERSION_PATTERN = /^v\d+$/;
const LEGACY_EXACT_PROFILE_VERSION_PATTERN = /^v\d+\.\d+\.\d+$/;

function isMajorProfileVersion(value) {
  return typeof value === "string" && MAJOR_PROFILE_VERSION_PATTERN.test(value);
}

export function extractMajorProfileVersion(value) {
  if (isMajorProfileVersion(value)) {
    return value;
  }

  if (typeof value === "string" && LEGACY_EXACT_PROFILE_VERSION_PATTERN.test(value)) {
    return value.match(/^v\d+/)?.[0] ?? null;
  }

  return null;
}

export function assertProfileVersion(value, field = "version") {
  if (isMajorProfileVersion(value)) {
    return value;
  }

  throw createCliError(
    "INVALID_PROFILE_VERSION",
    `Invalid ${field}: ${value}. Use v1 style versions.`,
    {
      field,
      value
    }
  );
}
