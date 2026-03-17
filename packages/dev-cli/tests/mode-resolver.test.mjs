import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveActiveProfile } from "../src/core/mode-resolver.mjs";

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("resolveActiveProfile은 explicit 설정을 repo와 global보다 우선한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-"));
  const tempHome = path.join(tempRoot, "home");
  const repoRoot = path.join(tempRoot, "repo");

  await mkdir(repoRoot, { recursive: true });
  await writeJson(path.join(repoRoot, ".try-claude-dev-cli.json"), {
    profiles: {
      publisher: {
        mode: "company",
        version: "v2"
      }
    }
  });

  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;

  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;

  await writeJson(path.join(tempHome, ".try-claude-dev-cli.json"), {
    profiles: {
      publisher: {
        mode: "global",
        version: "v9"
      }
    }
  });

  const resolved = await resolveActiveProfile({
    role: "publisher",
    repoRoot,
    options: {
      mode: "personal",
      version: "v1"
    }
  });

  assert.deepEqual(resolved, {
    source: "explicit",
    mode: "personal",
    version: "v1",
    requestedVersion: "v1",
    majorVersion: "v1"
  });

  process.env.HOME = originalHome;
  process.env.USERPROFILE = originalUserProfile;
});

test("resolveActiveProfile은 repo 설정이 없으면 global 설정으로 fallback한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-"));
  const tempHome = path.join(tempRoot, "home");
  const repoRoot = path.join(tempRoot, "repo");

  await mkdir(repoRoot, { recursive: true });
  await writeJson(path.join(repoRoot, ".try-claude-dev-cli.json"), {
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

  await writeJson(path.join(tempHome, ".try-claude-dev-cli.json"), {
    profiles: {
      frontend: {
        mode: "personal",
        version: "v3"
      }
    }
  });

  const repoResolved = await resolveActiveProfile({
    role: "frontend",
    repoRoot,
    options: {}
  });

  assert.deepEqual(repoResolved, {
    source: "repo",
    mode: "company",
    version: "v2",
    requestedVersion: "v2",
    majorVersion: "v2",
    resolvedVersion: null,
    resolvedRef: null
  });

  await writeJson(path.join(repoRoot, ".try-claude-dev-cli.json"), {});

  const globalResolved = await resolveActiveProfile({
    role: "frontend",
    repoRoot,
    options: {}
  });

  assert.deepEqual(globalResolved, {
    source: "global",
    mode: "personal",
    version: "v3",
    requestedVersion: "v3",
    majorVersion: "v3",
    resolvedVersion: null,
    resolvedRef: null
  });

  process.env.HOME = originalHome;
  process.env.USERPROFILE = originalUserProfile;
});

test("resolveActiveProfile은 기존 version 필드 config를 requestedVersion으로 읽는다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-"));
  const repoRoot = path.join(tempRoot, "repo");

  await mkdir(repoRoot, { recursive: true });
  await writeJson(path.join(repoRoot, ".try-claude-dev-cli.json"), {
    profiles: {
      backend: {
        mode: "personal",
        version: "v1"
      }
    }
  });

  const resolved = await resolveActiveProfile({
    role: "backend",
    repoRoot,
    options: {}
  });

  assert.deepEqual(resolved, {
    source: "repo",
    mode: "personal",
    version: "v1",
    requestedVersion: "v1",
    majorVersion: "v1",
    resolvedVersion: null,
    resolvedRef: null
  });
});

test("resolveActiveProfile은 exact version 입력을 바로 pinned selection으로 정규화한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-"));
  const repoRoot = path.join(tempRoot, "repo");

  await mkdir(repoRoot, { recursive: true });

  const resolved = await resolveActiveProfile({
    role: "publisher",
    repoRoot,
    options: {
      mode: "personal",
      version: "v1.0.3"
    }
  });

  assert.deepEqual(resolved, {
    source: "explicit",
    mode: "personal",
    version: "v1.0.3",
    requestedVersion: "v1.0.3",
    majorVersion: "v1"
  });
});
