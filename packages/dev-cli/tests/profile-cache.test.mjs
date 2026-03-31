import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { runCli as runCliCore } from "../src/run-cli.mjs";
import { createTempHome, createTempRepo, readJson, runCli, backendBin } from "./test-utils.mjs";

/**
 * Phase 2 rebaseline:
 *
 * frontend bin now uses the manifest path and does not have a `mode set`
 * command.  Profile-cache tests are migrated to backendBin which still
 * uses the legacy alias path.
 */

function createWritableBuffer() {
  let content = "";

  return {
    write(chunk) {
      content += String(chunk);
      return true;
    },
    toString() {
      return content;
    }
  };
}

async function withHomeEnv(homeDirectory, callback) {
  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;

  process.env.HOME = homeDirectory;
  process.env.USERPROFILE = homeDirectory;

  try {
    return await callback();
  } finally {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }

    if (originalUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = originalUserProfile;
    }
  }
}

test("mode set은 원격 profile snapshot을 홈 캐시에 저장한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "backend/personal/v1"]
  });
  const tempHome = await createTempHome();

  const result = runCli(backendBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v1"
  ], {
    cwd: tempRoot,
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome,
      TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
    }
  });

  assert.equal(result.status, 0);
  assert.equal(readJson(result.stdout).ok, true);

  const cachePath = path.join(
    tempHome,
    ".try-claude-dev-cli-cache",
    "profiles",
    "backend",
    "personal",
    "v1",
    "profile.json"
  );
  const cachedEntry = JSON.parse(await readFile(cachePath, "utf8"));

  assert.equal(cachedEntry.profile.id, "backend/personal/v1");
  // module uses templateFiles (multi-variant) → cached as templateContents
  const moduleRender = cachedEntry.profile.commands.module.render;
  assert.ok(
    typeof moduleRender.templateContent === "string" ||
    (moduleRender.templateContents !== undefined && typeof moduleRender.templateContents === "object"),
    "module render should have templateContent or templateContents in cache"
  );
  assert.ok(
    cachedEntry.profile.commands.module.normalizationRules !== undefined ||
    cachedEntry.profile.commands.module.description !== undefined,
    "module command should have expected fields in cache"
  );
});

test("캐시된 profile이 있으면 backend --help는 오프라인에서도 동작한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "backend/personal/v1"]
  });
  const tempHome = await createTempHome();

  const setResult = runCli(backendBin, [
    "mode",
    "set",
    "--mode",
    "personal",
    "--version",
    "v1"
  ], {
    cwd: tempRoot,
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome,
      TRY_CLAUDE_TEST_PROFILE_ROOT: tempRoot
    }
  });

  assert.equal(setResult.status, 0);

  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();
  const originalFetch = globalThis.fetch;
  const originalExitCode = process.exitCode;

  globalThis.fetch = async () => {
    throw new Error("offline");
  };

  try {
    const exitCode = await withHomeEnv(tempHome, async () =>
      runCliCore({
        alias: "backend",
        argv: ["--help"],
        cwd: tempRoot,
        stdout,
        stderr
      })
    );

    assert.equal(exitCode, 0);
    assert.equal(stderr.toString(), "");

    const payload = JSON.parse(stdout.toString());
    assert.equal(payload.helpMode, "summary");
    assert.equal(payload.id, "backend/personal/v1");
    assert.equal(payload.activeProfile.mode, "personal");
    assert.equal(payload.activeProfile.version, "v1");
  } finally {
    globalThis.fetch = originalFetch;
    process.exitCode = originalExitCode;
  }
});
