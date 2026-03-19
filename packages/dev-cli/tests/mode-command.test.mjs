import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { cp, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";

import { createTempHome, readJson, projectRoot, runCli, tcpBin } from "./test-utils.mjs";

async function copyProfileTree(root, profileId) {
  const source = path.join(projectRoot, "profiles", ...profileId.split("/"));
  const target = path.join(root, "profiles", ...profileId.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, {
    recursive: true
  });
}

test("mode set/show는 global config에 mode와 major version만 저장하고 보여준다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-command-"));
  const tempHome = await createTempHome();
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempProject, { recursive: true });
  await copyProfileTree(tempRoot, "shared/personal/v1");
  await copyProfileTree(tempRoot, "publisher/personal/v1");

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
  assert.equal(setPayload.configured, undefined);
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
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome,
      TRY_CLAUDE_TEST_PROFILE_ROOT: path.join(tempRoot, "missing-profile-root")
    }
  });
  assert.equal(showResult.status, 0);
  const showPayload = readJson(showResult.stdout);
  assert.equal(showPayload.configured, true);
  assert.deepEqual(showPayload.activeProfile, {
    source: "global",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });
});

test("mode show는 active profile이 없으면 unset 상태를 성공 payload로 반환한다", async () => {
  const tempHome = await createTempHome();
  const configPath = path.join(tempHome, ".try-claude-dev-cli.json");
  await writeFile(configPath, `${JSON.stringify({}, null, 2)}\n`, "utf8");

  const result = runCli(tcpBin, ["mode", "show"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.configured, false);
  assert.equal(payload.activeProfile, null);
  assert.equal(payload.suggestedCommand, "tcp mode set --mode personal --version v1");
});

test("mode set은 exact version 입력을 거부한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-exact-"));
  const tempHome = await createTempHome();
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempProject, { recursive: true });
  await copyProfileTree(tempRoot, "shared/personal/v1");
  await copyProfileTree(tempRoot, "publisher/personal/v1");

  const result = runCli(tcpBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v1.0.0"
  ], {
    cwd: tempProject,
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome,
      TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "INVALID_PROFILE_VERSION");
});

test("mode set은 존재하지 않는 remote profile을 PROFILE_NOT_FOUND로 안내한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-missing-"));
  const tempHome = await createTempHome();
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempProject, { recursive: true });

  const result = runCli(tcpBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v999"
  ], {
    cwd: tempProject,
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome,
      TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "PROFILE_NOT_FOUND");
  assert.equal(payload.error.details.relativePath, "profiles/publisher/personal/v999/profile.json");
});

test("mode set은 --repo를 더 이상 허용하지 않는다", async () => {
  const result = runCli(tcpBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v1",
    "--repo"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNKNOWN_OPTION");
  assert.equal(payload.error.details.option, "repo");
});

test("mode update는 여전히 unsupported action으로 실패한다", async () => {
  const result = runCli(tcpBin, ["mode", "update"]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNSUPPORTED_MODE_ACTION");
});

test("mode show는 legacy exact-version global config를 major version으로 정규화한다", async () => {
  const tempHome = await createTempHome({
    profiles: {
      publisher: {
        mode: "personal",
        requestedVersion: "v1.0.3",
        resolvedVersion: "v1.0.3",
        resolvedRef: "profiles-v1.0.3"
      }
    }
  });

  const result = runCli(tcpBin, ["mode", "show"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.configured, true);
  assert.deepEqual(payload.activeProfile, {
    source: "global",
    mode: "personal",
    version: "v1",
    majorVersion: "v1"
  });
});
