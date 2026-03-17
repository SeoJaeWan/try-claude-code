import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { readJson, runCli, tcpBin } from "./test-utils.mjs";

test("mode set/show는 requestedVersion과 resolvedVersion/ref를 함께 저장하고 보여준다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-command-"));
  const tempHome = path.join(tempRoot, "home");
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempHome, { recursive: true });
  await mkdir(tempProject, { recursive: true });

  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome
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
  assert.equal(setPayload.activeProfile.requestedVersion, "v1");
  assert.equal(setPayload.activeProfile.resolvedVersion, "v1.0.0");
  assert.match(setPayload.activeProfile.resolvedRef, /\S+/);

  const configPath = path.join(tempHome, ".try-claude-dev-cli.json");
  const savedConfig = JSON.parse(await readFile(configPath, "utf8"));
  assert.deepEqual(savedConfig.profiles.publisher, {
    mode: "personal",
    requestedVersion: "v1",
    resolvedVersion: "v1.0.0",
    resolvedRef: setPayload.activeProfile.resolvedRef
  });

  const showResult = runCli(tcpBin, ["mode", "show"], {
    cwd: tempProject,
    env
  });
  assert.equal(showResult.status, 0);
  const showPayload = readJson(showResult.stdout);
  assert.equal(showPayload.activeProfile.requestedVersion, "v1");
  assert.equal(showPayload.activeProfile.resolvedVersion, "v1.0.0");
  assert.equal(showPayload.activeProfile.resolvedRef, setPayload.activeProfile.resolvedRef);
});

test("mode update는 channel selection만 최신 patch로 올린다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-update-"));
  const tempHome = path.join(tempRoot, "home");
  const tempProject = path.join(tempRoot, "project");
  const registryPath = path.join(tempRoot, "registry.json");

  await mkdir(tempHome, { recursive: true });
  await mkdir(tempProject, { recursive: true });
  await writeFile(
    registryPath,
    `${JSON.stringify({
      publisher: {
        personal: {
          v1: {
            latest: "v1.0.0",
            versions: ["v1.0.0"]
          }
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome,
    TRY_CLAUDE_PROFILE_REGISTRY_URL: pathToFileURL(registryPath).href
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

  await writeFile(
    registryPath,
    `${JSON.stringify({
      publisher: {
        personal: {
          v1: {
            latest: "v1.0.1",
            versions: ["v1.0.0", "v1.0.1"]
          }
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const updateResult = runCli(tcpBin, ["mode", "update"], {
    cwd: tempProject,
    env
  });
  assert.equal(updateResult.status, 0);
  const updatePayload = readJson(updateResult.stdout);
  assert.equal(updatePayload.updated, true);
  assert.equal(updatePayload.activeProfile.resolvedVersion, "v1.0.1");
  assert.equal(updatePayload.activeProfile.resolvedRef, "profiles-v1.0.1");
});

test("mode set을 같은 major version으로 다시 호출하면 latest exact release를 다시 resolve한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-set-latest-"));
  const tempHome = path.join(tempRoot, "home");
  const tempProject = path.join(tempRoot, "project");
  const registryPath = path.join(tempRoot, "registry.json");

  await mkdir(tempHome, { recursive: true });
  await mkdir(tempProject, { recursive: true });
  await writeFile(
    registryPath,
    `${JSON.stringify({
      publisher: {
        personal: {
          v1: {
            latest: "v1.0.0",
            versions: ["v1.0.0"]
          }
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome,
    TRY_CLAUDE_PROFILE_REGISTRY_URL: pathToFileURL(registryPath).href
  };

  const firstSet = runCli(tcpBin, [
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
  assert.equal(firstSet.status, 0);
  assert.equal(readJson(firstSet.stdout).activeProfile.resolvedVersion, "v1.0.0");

  await writeFile(
    registryPath,
    `${JSON.stringify({
      publisher: {
        personal: {
          v1: {
            latest: "v1.0.2",
            versions: ["v1.0.0", "v1.0.2"]
          }
        }
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const secondSet = runCli(tcpBin, [
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
  assert.equal(secondSet.status, 0);
  const secondPayload = readJson(secondSet.stdout);
  assert.equal(secondPayload.activeProfile.requestedVersion, "v1");
  assert.equal(secondPayload.activeProfile.resolvedVersion, "v1.0.2");
  assert.equal(secondPayload.activeProfile.resolvedRef, "profiles-v1.0.2");
});

test("mode update는 exact pinned version이면 no-op으로 종료한다", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-mode-exact-"));
  const tempHome = path.join(tempRoot, "home");
  const tempProject = path.join(tempRoot, "project");

  await mkdir(tempHome, { recursive: true });
  await mkdir(tempProject, { recursive: true });

  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome
  };

  const setResult = runCli(tcpBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v1.0.3"
  ], {
    cwd: tempProject,
    env
  });
  assert.equal(setResult.status, 0);

  const updateResult = runCli(tcpBin, ["mode", "update"], {
    cwd: tempProject,
    env
  });
  assert.equal(updateResult.status, 0);
  const updatePayload = readJson(updateResult.stdout);
  assert.equal(updatePayload.updated, false);
  assert.equal(updatePayload.reason, "EXACT_VERSION_PINNED");
  assert.equal(updatePayload.activeProfile.resolvedVersion, "v1.0.3");
  assert.equal(updatePayload.activeProfile.resolvedRef, "profiles-v1.0.3");
});
