import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  ensurePinnedResourceFile,
  hydrateProfileSelection,
  loadProfileRegistry
} from "../src/core/profile-registry.mjs";
import { loadActiveProfile } from "../src/core/profile-loader.mjs";
import { repoRoot } from "./test-utils.mjs";

test("hydrateProfileSelection은 exact version 입력을 direct ref로 해석한다", async () => {
  const selection = await hydrateProfileSelection({
    role: "publisher",
    selection: {
      source: "explicit",
      mode: "personal",
      requestedVersion: "v1.0.3"
    }
  });

  assert.equal(selection.majorVersion, "v1");
  assert.equal(selection.resolvedVersion, "v1.0.3");
  assert.equal(selection.resolvedRef, "profiles-v1.0.3");
});

test("hydrateProfileSelection은 registry에 exact version ref가 있으면 그것을 우선 사용한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-registry-exact-"));
  const registryPath = path.join(tempRoot, "registry.json");
  const originalRegistryUrl = process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL;

  await writeFile(
    registryPath,
    `${JSON.stringify({
      publisher: {
        personal: {
          v1: {
            latest: "v1.0.1",
            versions: {
              "v1.0.0": {
                ref: "legacy-v1.0.0-sha"
              },
              "v1.0.1": {}
            }
          }
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL = pathToFileURL(registryPath).href;

  const selection = await hydrateProfileSelection({
    role: "publisher",
    selection: {
      source: "explicit",
      mode: "personal",
      requestedVersion: "v1.0.0"
    }
  });

  assert.equal(selection.resolvedVersion, "v1.0.0");
  assert.equal(selection.resolvedRef, "legacy-v1.0.0-sha");

  if (originalRegistryUrl === undefined) {
    delete process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL;
  } else {
    process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL = originalRegistryUrl;
  }
});

test("loadActiveProfile은 remote registry/file base에서도 extends merge와 template path 해석을 유지한다", async () => {
  const originalRegistryUrl = process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL;
  const originalRawBaseUrl = process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL;

  process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL = pathToFileURL(
    path.join(repoRoot, "profiles", "registry.json")
  ).href;
  process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL = pathToFileURL(repoRoot).href;

  const { profile, activeProfile } = await loadActiveProfile({
    repoRoot,
    role: "publisher",
    mode: "personal",
    requestedVersion: "v1"
  });

  assert.equal(activeProfile.resolvedVersion, "v1.0.0");
  assert.equal(profile.commands.component.render.templatePath.endsWith(
    path.join("profiles", "publisher", "personal", "v1", "templates", "component.default.tsx")
  ), true);
  assert.equal(
    profile.commands.function.namingPolicy.prefixes.internalHandler,
    "handle"
  );

  if (originalRegistryUrl === undefined) {
    delete process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL;
  } else {
    process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL = originalRegistryUrl;
  }
  if (originalRawBaseUrl === undefined) {
    delete process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL;
  } else {
    process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL = originalRawBaseUrl;
  }
});

test("loadProfileRegistry는 remote fetch 실패 시 캐시가 있으면 cached registry를 사용한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-registry-"));
  const originalRegistryUrl = process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL;
  const originalCacheDir = process.env.TRY_CLAUDE_PROFILE_CACHE_DIR;
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL = "https://example.com/profiles/registry.json";
  process.env.TRY_CLAUDE_PROFILE_CACHE_DIR = tempRoot;
  globalThis.fetch = async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        ok: true,
        text: async () => JSON.stringify({
          publisher: {
            personal: {
              v1: {
                latest: "v1.0.0",
                versions: {
                  "v1.0.0": {
                    ref: "profiles-v1.0.0"
                  }
                }
              }
            }
          }
        })
      };
    }

    throw new Error("network down");
  };

  const first = await loadProfileRegistry();
  const second = await loadProfileRegistry();

  assert.equal(first.publisher.personal.v1.latest, "v1.0.0");
  assert.equal(second.publisher.personal.v1.versions["v1.0.0"].ref, "profiles-v1.0.0");

  if (originalRegistryUrl === undefined) {
    delete process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL;
  } else {
    process.env.TRY_CLAUDE_PROFILE_REGISTRY_URL = originalRegistryUrl;
  }
  if (originalCacheDir === undefined) {
    delete process.env.TRY_CLAUDE_PROFILE_CACHE_DIR;
  } else {
    process.env.TRY_CLAUDE_PROFILE_CACHE_DIR = originalCacheDir;
  }
  globalThis.fetch = originalFetch;
});

test("ensurePinnedResourceFile는 pinned remote fetch 실패 시 캐시된 파일을 재사용한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-pinned-"));
  const originalRawBaseUrl = process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL;
  const originalCacheDir = process.env.TRY_CLAUDE_PROFILE_CACHE_DIR;
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL = "https://example.com/raw/{ref}";
  process.env.TRY_CLAUDE_PROFILE_CACHE_DIR = tempRoot;
  globalThis.fetch = async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        ok: true,
        text: async () => '{"ok":true}'
      };
    }

    throw new Error("network down");
  };

  const relativePath = "profiles/publisher/personal/v1/profile.json";
  const firstPath = await ensurePinnedResourceFile({
    resolvedRef: "profiles-v1.0.0",
    relativePath
  });
  const secondPath = await ensurePinnedResourceFile({
    resolvedRef: "profiles-v1.0.0",
    relativePath
  });

  assert.equal(firstPath, secondPath);

  if (originalRawBaseUrl === undefined) {
    delete process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL;
  } else {
    process.env.TRY_CLAUDE_PROFILE_RAW_BASE_URL = originalRawBaseUrl;
  }
  if (originalCacheDir === undefined) {
    delete process.env.TRY_CLAUDE_PROFILE_CACHE_DIR;
  } else {
    process.env.TRY_CLAUDE_PROFILE_CACHE_DIR = originalCacheDir;
  }
  globalThis.fetch = originalFetch;
});
