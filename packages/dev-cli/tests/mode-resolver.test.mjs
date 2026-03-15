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

test("resolveActiveProfile prefers explicit over repo and global", async () => {
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
    version: "v1"
  });

  process.env.HOME = originalHome;
  process.env.USERPROFILE = originalUserProfile;
});

test("resolveActiveProfile falls back to repo and then global", async () => {
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
    version: "v2"
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
    version: "v3"
  });

  process.env.HOME = originalHome;
  process.env.USERPROFILE = originalUserProfile;
});
