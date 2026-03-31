import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { cp, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";

import { createTempHome, readJson, projectRoot, runCli, frontendBin, backendBin } from "./test-utils.mjs";

/**
 * Phase 2 rebaseline:
 *
 * frontend bin now uses the manifest path.  The `mode` command is not part
 * of the manifest surface, so all `frontend mode *` calls return
 * UNKNOWN_COMMAND.
 *
 * backend bin still uses the legacy alias path (Phase 3 will migrate it).
 * backend mode set/show tests are preserved here using backendBin.
 */

async function copyProfileTree(root, profileId) {
  const source = path.join(projectRoot, "profiles", ...profileId.split("/"));
  const target = path.join(root, "profiles", ...profileId.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, {
    recursive: true
  });
}

// ---- frontend mode commands return UNKNOWN_COMMAND (manifest path) ----

test("frontend mode set은 manifest 경로에서 UNKNOWN_COMMAND로 실패한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(frontendBin, ["mode", "set", "--mode", "personal", "--version", "v1"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
  assert.equal(payload.error.details.command, "mode");
});

test("frontend mode show는 manifest 경로에서 UNKNOWN_COMMAND로 실패한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(frontendBin, ["mode", "show"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
});

// ---- backend mode commands still work on the legacy path ----

test("backend mode set/show는 global config에 mode와 major version만 저장하고 보여준다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-command-"));
  const tempHome = await createTempHome();
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempProject, { recursive: true });
  await copyProfileTree(tempRoot, "shared/personal/v1");
  await copyProfileTree(tempRoot, "backend/personal/v1");

  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome,
    TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
  };

  const setResult = runCli(backendBin, [
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
  assert.deepEqual(savedConfig.profiles.backend, {
    mode: "personal",
    version: "v1"
  });

  const showResult = runCli(backendBin, ["mode", "show"], {
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

test("backend mode show는 active profile이 없으면 unset 상태를 성공 payload로 반환한다", async () => {
  const tempHome = await createTempHome();
  const configPath = path.join(tempHome, ".try-claude-dev-cli.json");
  await writeFile(configPath, `${JSON.stringify({}, null, 2)}\n`, "utf8");

  const result = runCli(backendBin, ["mode", "show"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.configured, false);
  assert.equal(payload.activeProfile, null);
  assert.equal(payload.suggestedCommand, "backend mode set --mode personal --version v1");
});

test("backend mode set은 exact version 입력을 거부한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-exact-"));
  const tempHome = await createTempHome();
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempProject, { recursive: true });
  await copyProfileTree(tempRoot, "shared/personal/v1");
  await copyProfileTree(tempRoot, "backend/personal/v1");

  const result = runCli(backendBin, [
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

test("backend mode set은 존재하지 않는 local profile을 PROFILE_NOT_FOUND로 안내한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-missing-"));
  const tempHome = await createTempHome();
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempProject, { recursive: true });

  const result = runCli(backendBin, [
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
  assert.equal(payload.error.details.relativePath, "profiles/backend/personal/v999/profile.json");
});

test("backend mode set은 --repo를 더 이상 허용하지 않는다", async () => {
  const result = runCli(backendBin, [
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

test("backend mode update는 여전히 unsupported action으로 실패한다", async () => {
  const result = runCli(backendBin, ["mode", "update"]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNSUPPORTED_MODE_ACTION");
});

test("backend mode show는 legacy exact-version global config를 major version으로 정규화한다", async () => {
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

  const result = runCli(backendBin, ["mode", "show"], {
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
