import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { runCli as runCliCore } from "../src/run-cli.mjs";
import { createTempHome, createTempRepo, readJson } from "./test-utils.mjs";

/**
 * Phase 3 rebaseline:
 *
 * Both frontend and backend bins now use the manifest path.
 * Profile-cache tests that depended on `backend mode set` (legacy path)
 * are replaced with direct runCliCore calls using the legacy alias path.
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

test("legacy runCliCore mode set은 원격 profile snapshot을 홈 캐시에 저장한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "backend/personal/v1"]
  });
  const tempHome = await createTempHome();

  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();
  const originalExitCode = process.exitCode;

  const exitCode = await withHomeEnv(tempHome, async () => {
    process.env.TRY_CLAUDE_TEST_PROFILE_ROOT = tempRoot;

    try {
      return await runCliCore({
        alias: "backend",
        argv: ["mode", "set", "--mode", "personal", "--version", "v1"],
        cwd: tempRoot,
        stdout,
        stderr
      });
    } finally {
      delete process.env.TRY_CLAUDE_TEST_PROFILE_ROOT;
    }
  });

  process.exitCode = originalExitCode;

  assert.equal(exitCode, 0);
  assert.equal(readJson(stdout.toString()).ok, true);

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

test("캐시된 profile이 있으면 legacy runCliCore backend --help는 오프라인에서도 동작한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "backend/personal/v1"]
  });
  const tempHome = await createTempHome();

  // Seed the cache via a direct legacy runCliCore call
  const setStdout = createWritableBuffer();
  const setStderr = createWritableBuffer();
  const originalExitCode = process.exitCode;

  const setExitCode = await withHomeEnv(tempHome, async () => {
    process.env.TRY_CLAUDE_TEST_PROFILE_ROOT = tempRoot;

    try {
      return await runCliCore({
        alias: "backend",
        argv: ["mode", "set", "--mode", "personal", "--version", "v1"],
        cwd: tempRoot,
        stdout: setStdout,
        stderr: setStderr
      });
    } finally {
      delete process.env.TRY_CLAUDE_TEST_PROFILE_ROOT;
    }
  });

  process.exitCode = originalExitCode;
  assert.equal(setExitCode, 0);

  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();
  const originalFetch = globalThis.fetch;

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
