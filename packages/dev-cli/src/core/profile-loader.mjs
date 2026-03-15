import { readFile } from "node:fs/promises";
import path from "node:path";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeValues(baseValue, nextValue) {
  if (Array.isArray(baseValue) && Array.isArray(nextValue)) {
    return [...new Set([...baseValue, ...nextValue])];
  }

  if (isPlainObject(baseValue) && isPlainObject(nextValue)) {
    return mergeObjects(baseValue, nextValue);
  }

  return nextValue;
}

function mergeObjects(baseObject, nextObject) {
  const result = { ...baseObject };
  for (const [key, value] of Object.entries(nextObject)) {
    if (!(key in result)) {
      result[key] = value;
      continue;
    }

    result[key] = mergeValues(result[key], value);
  }

  return result;
}

function resolveCommandTemplatePaths(profileDir, command) {
  const resolved = { ...command };

  if (resolved.templateFile) {
    resolved.templatePath = path.join(profileDir, resolved.templateFile);
  }

  if (resolved.templateFiles) {
    resolved.templatePaths = Object.fromEntries(
      Object.entries(resolved.templateFiles).map(([key, value]) => [
        key,
        path.join(profileDir, value)
      ])
    );
  }

  return resolved;
}

async function loadProfileById(repoRoot, profileId, seen = new Set()) {
  if (seen.has(profileId)) {
    const error = new Error(`Circular profile dependency: ${profileId}`);
    error.code = "PROFILE_CYCLE";
    throw error;
  }

  seen.add(profileId);

  const profileDir = path.join(repoRoot, "profiles", ...profileId.split("/"));
  const profilePath = path.join(profileDir, "profile.json");
  const content = await readFile(profilePath, "utf8");
  const rawProfile = JSON.parse(content);
  const baseProfiles = [];

  for (const dependency of rawProfile.extends ?? []) {
    baseProfiles.push(await loadProfileById(repoRoot, dependency, seen));
  }

  const preparedProfile = {
    ...rawProfile,
    profileDir,
    commands: Object.fromEntries(
      Object.entries(rawProfile.commands ?? {}).map(([key, value]) => [
        key,
        resolveCommandTemplatePaths(profileDir, value)
      ])
    )
  };

  const mergedBase = baseProfiles.reduce(
    (accumulator, profile) => mergeObjects(accumulator, profile),
    {}
  );

  return mergeObjects(mergedBase, preparedProfile);
}

export async function loadActiveProfile({
  repoRoot,
  role,
  mode,
  version
}) {
  const profileId = `${role}/${mode}/${version}`;
  const profile = await loadProfileById(repoRoot, profileId);

  return {
    profileId,
    profile
  };
}
