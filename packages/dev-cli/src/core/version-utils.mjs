import { createCliError } from "./recipe-utils.mjs";

const MAJOR_PROFILE_VERSION_PATTERN = /^v\d+$/;
const EXACT_PROFILE_VERSION_PATTERN = /^v\d+\.\d+\.\d+$/;

export function isMajorProfileVersion(value) {
  return typeof value === "string" && MAJOR_PROFILE_VERSION_PATTERN.test(value);
}

export function isExactProfileVersion(value) {
  return typeof value === "string" && EXACT_PROFILE_VERSION_PATTERN.test(value);
}

export function extractMajorProfileVersion(value) {
  if (isMajorProfileVersion(value)) {
    return value;
  }

  if (isExactProfileVersion(value)) {
    return value.match(/^v\d+/)?.[0] ?? null;
  }

  return null;
}

export function assertProfileVersion(value, field = "version") {
  if (isMajorProfileVersion(value) || isExactProfileVersion(value)) {
    return value;
  }

  throw createCliError(
    "INVALID_PROFILE_VERSION",
    `Invalid ${field}: ${value}. Use v1 or v1.0.0 style versions.`,
    {
      field,
      value
    }
  );
}

export function createProfileRef({
  role,
  mode,
  resolvedVersion
}) {
  return `profile-${role}-${mode}-${resolvedVersion}`;
}
