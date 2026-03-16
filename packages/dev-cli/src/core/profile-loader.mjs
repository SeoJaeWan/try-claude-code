import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ensurePinnedResourceFile,
  hydrateProfileSelection,
  readPinnedJsonResource
} from "./profile-registry.mjs";
import { extractMajorProfileVersion } from "./version-utils.mjs";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getArrayKey(value) {
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return `${typeof value}:${String(value)}`;
}

function mergeValues(baseValue, nextValue) {
  if (Array.isArray(baseValue) && Array.isArray(nextValue)) {
    const seen = new Set();
    const merged = [];

    for (const value of [...baseValue, ...nextValue]) {
      const key = getArrayKey(value);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(value);
    }

    return merged;
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

function resolveRenderPathsLocal(profileDir, render = {}) {
  const resolved = { ...render };

  if (resolved.snippetTemplate) {
    resolved.snippetTemplatePath = path.join(profileDir, resolved.snippetTemplate);
  }

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

async function resolveRenderPathsRemote(profileDirRelative, resolvedRef, render = {}) {
  const resolved = { ...render };

  if (resolved.snippetTemplate) {
    resolved.snippetTemplatePath = await ensurePinnedResourceFile({
      resolvedRef,
      relativePath: path.posix.join(profileDirRelative, resolved.snippetTemplate)
    });
  }

  if (resolved.templateFile) {
    resolved.templatePath = await ensurePinnedResourceFile({
      resolvedRef,
      relativePath: path.posix.join(profileDirRelative, resolved.templateFile)
    });
  }

  if (resolved.templateFiles) {
    resolved.templatePaths = Object.fromEntries(
      await Promise.all(
        Object.entries(resolved.templateFiles).map(async ([key, value]) => [
          key,
          await ensurePinnedResourceFile({
            resolvedRef,
            relativePath: path.posix.join(profileDirRelative, value)
          })
        ])
      )
    );
  }

  return resolved;
}

function resolveCommandTemplatePathsLocal(profileDir, command) {
  const resolved = {
    ...command
  };

  if (resolved.render) {
    resolved.render = resolveRenderPathsLocal(profileDir, resolved.render);
  }

  return resolved;
}

async function resolveCommandTemplatePathsRemote(profileDirRelative, resolvedRef, command) {
  const resolved = {
    ...command
  };

  if (resolved.render) {
    resolved.render = await resolveRenderPathsRemote(
      profileDirRelative,
      resolvedRef,
      resolved.render
    );
  }

  return resolved;
}

async function loadLocalProfileById(localProfileRoot, profileId, seen = new Set()) {
  if (seen.has(profileId)) {
    const error = new Error(`Circular profile dependency: ${profileId}`);
    error.code = "PROFILE_CYCLE";
    throw error;
  }

  seen.add(profileId);

  const profileDir = path.join(localProfileRoot, "profiles", ...profileId.split("/"));
  const profilePath = path.join(profileDir, "profile.json");
  const content = await readFile(profilePath, "utf8");
  const rawProfile = JSON.parse(content);
  const baseProfiles = [];

  for (const dependency of rawProfile.extends ?? []) {
    baseProfiles.push(await loadLocalProfileById(localProfileRoot, dependency, seen));
  }

  const preparedProfile = {
    ...rawProfile,
    profileDir,
    commands: Object.fromEntries(
      Object.entries(rawProfile.commands ?? {}).map(([key, value]) => [
        key,
        resolveCommandTemplatePathsLocal(profileDir, value)
      ])
    )
  };

  const mergedBase = baseProfiles.reduce(
    (accumulator, profile) => mergeObjects(accumulator, profile),
    {}
  );

  return mergeObjects(mergedBase, preparedProfile);
}

async function loadRemoteProfileById(resolvedRef, profileId, seen = new Set()) {
  if (seen.has(profileId)) {
    const error = new Error(`Circular profile dependency: ${profileId}`);
    error.code = "PROFILE_CYCLE";
    throw error;
  }

  seen.add(profileId);

  const profileDirRelative = path.posix.join("profiles", ...profileId.split("/"));
  const profilePath = path.posix.join(profileDirRelative, "profile.json");
  const profileFilePath = await ensurePinnedResourceFile({
    resolvedRef,
    relativePath: profilePath
  });
  const rawProfile = await readPinnedJsonResource({
    resolvedRef,
    relativePath: profilePath
  });
  const baseProfiles = [];

  for (const dependency of rawProfile.extends ?? []) {
    baseProfiles.push(await loadRemoteProfileById(resolvedRef, dependency, seen));
  }

  const preparedProfile = {
    ...rawProfile,
    profileDir: path.dirname(profileFilePath),
    commands: Object.fromEntries(
      await Promise.all(
        Object.entries(rawProfile.commands ?? {}).map(async ([key, value]) => [
          key,
          await resolveCommandTemplatePathsRemote(profileDirRelative, resolvedRef, value)
        ])
      )
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
  version,
  requestedVersion,
  resolvedVersion,
  resolvedRef,
  localProfileRoot
}) {
  const requested = requestedVersion ?? version ?? resolvedVersion ?? "v1";
  const majorVersion = extractMajorProfileVersion(requested) ?? requested;
  const profileId = `${role}/${mode}/${majorVersion}`;

  if (localProfileRoot) {
    const profile = await loadLocalProfileById(localProfileRoot, profileId);

    return {
      profileId,
      profile
    };
  }

  const activeProfile = await hydrateProfileSelection({
    role,
    selection: {
      source: "runtime",
      mode,
      requestedVersion: requested,
      resolvedVersion,
      resolvedRef
    }
  });
  const resolvedProfileId = `${role}/${activeProfile.mode}/${activeProfile.majorVersion}`;
  const profile = await loadRemoteProfileById(
    activeProfile.resolvedRef,
    resolvedProfileId
  );

  return {
    profileId: resolvedProfileId,
    profile,
    activeProfile
  };
}
