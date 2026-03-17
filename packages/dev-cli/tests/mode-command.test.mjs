import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";

import { readJson, runCli, tcpBin } from "./test-utils.mjs";

async function writeRegistry(root, registry) {
  const profilesDir = path.join(root, "profiles");
  await mkdir(profilesDir, { recursive: true });
  await writeFile(
    path.join(profilesDir, "registry.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8"
  );
}

test("mode set/show는 mode와 major version만 저장하고 보여준다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-command-"));
  const tempHome = path.join(tempRoot, "home");
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempHome, { recursive: true });
  await mkdir(tempProject, { recursive: true });
  await writeRegistry(tempRoot, {
    publisher: {
      personal: ["v1"]
    }
  });

  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome,
    TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
  };

  const setResult = runCli(tcpBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v1"
  ], {
    cwd: tempProject,
    env
  });
  assert.equal(setResult.status, 0);
  const setPayload = readJson(setResult.stdout);
  assert.deepEqual(setPayload.activeProfile, {
    source: "explicit",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });

  const configPath = path.join(tempHome, ".try-claude-dev-cli.json");
  const savedConfig = JSON.parse(await readFile(configPath, "utf8"));
  assert.deepEqual(savedConfig.profiles.publisher, {
    mode: "personal",
    version: "v1"
  });

  const showResult = runCli(tcpBin, ["mode", "show"], {
    cwd: tempProject,
    env
  });
  assert.equal(showResult.status, 0);
  const showPayload = readJson(showResult.stdout);
  assert.deepEqual(showPayload.activeProfile, {
    source: "global",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });
});

test("mode set은 exact version 입력을 거부한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-exact-"));
  const tempHome = path.join(tempRoot, "home");
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempHome, { recursive: true });
  await mkdir(tempProject, { recursive: true });
  await writeRegistry(tempRoot, {
    publisher: {
      personal: ["v1"]
    }
  });

  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome,
    TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
  };

  const result = runCli(tcpBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v1.0.0"
  ], {
    cwd: tempProject,
    env
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "INVALID_PROFILE_VERSION");
});

test("mode update는 더 이상 지원하지 않는다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-update-"));
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempProject, { recursive: true });
  await writeRegistry(tempRoot, {
    publisher: {
      personal: ["v1"]
    }
  });

  const result = runCli(tcpBin, ["mode", "update"], {
    cwd: tempProject,
    env: {
      TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNSUPPORTED_MODE_ACTION");
});

test("mode show는 legacy exact-version config를 major version으로 정규화한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-legacy-"));
  const tempHome = path.join(tempRoot, "home");
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempHome, { recursive: true });
  await mkdir(tempProject, { recursive: true });
  await writeRegistry(tempRoot, {
    publisher: {
      personal: ["v1"]
    }
  });
  await writeFile(
    path.join(tempHome, ".try-claude-dev-cli.json"),
    `${JSON.stringify({
      profiles: {
        publisher: {
          mode: "personal",
          requestedVersion: "v1.0.3",
          resolvedVersion: "v1.0.3",
          resolvedRef: "profiles-v1.0.3"
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const result = runCli(tcpBin, ["mode", "show"], {
    cwd: tempProject,
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome,
      TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.deepEqual(payload.activeProfile, {
    source: "global",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });
});
