import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createTempHome } from "./test-utils.mjs";
import { resolveActiveProfile } from "../src/core/mode-resolver.mjs";

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("resolveActiveProfile은 global 설정만 읽는다", async () => {
  const tempHome = await createTempHome({
    profiles: {
      publisher: {
        mode: "personal",
        version: "v1"
      }
    }
  });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;

  const resolved = await resolveActiveProfile({
    role: "publisher"
  });

  assert.deepEqual(resolved, {
    source: "global",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });

  process.env.HOME = originalHome;
  process.env.USERPROFILE = originalUserProfile;
});

test("resolveActiveProfile은 repo-local config를 무시하고 global이 없으면 null을 반환한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-"));
  const tempHome = await createTempHome();
  const projectRoot = path.join(tempRoot, "repo");

  await mkdir(projectRoot, { recursive: true });
  await writeJson(path.join(projectRoot, ".try-claude-dev-cli.json"), {
    profiles: {
      frontend: {
        mode: "company",
        version: "v2"
      }
    }
  });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;

  const resolved = await resolveActiveProfile({
    role: "frontend",
    projectRoot
  });

  assert.equal(resolved, null);

  process.env.HOME = originalHome;
  process.env.USERPROFILE = originalUserProfile;
});

test("resolveActiveProfile은 legacy exact version global config를 major version으로 정규화한다", async () => {
  const tempHome = await createTempHome({
    profiles: {
      backend: {
        mode: "personal",
        requestedVersion: "v1.0.3",
        resolvedVersion: "v1.0.3",
        resolvedRef: "profiles-v1.0.3"
      }
    }
  });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;

  const resolved = await resolveActiveProfile({
    role: "backend"
  });

  assert.deepEqual(resolved, {
    source: "global",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });

  process.env.HOME = originalHome;
  process.env.USERPROFILE = originalUserProfile;
});
