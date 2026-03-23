import test from "node:test";
import assert from "node:assert/strict";

import { createTempHome, readJson, runCli, frontendBin, backendBin } from "./test-utils.mjs";

test("active mode가 없으면 frontend --help는 bootstrap help JSON을 반환한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(frontendBin, ["--help"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.helpMode, "bootstrap");
  assert.equal(payload.configured, false);
  assert.equal(payload.suggestedCommand, "frontend mode set --mode personal --version v1");
  assert.equal(payload.inspectCommand, "frontend mode show");
  assert.deepEqual(payload.availableWithoutMode, [
    "frontend --help",
    "frontend mode show",
    "frontend mode set --mode personal --version v1"
  ]);
  assert.equal(payload.command, null);
});

test("active mode가 없으면 command-scoped help는 alias와 관계없이 ACTIVE_PROFILE_NOT_SET으로 실패한다", async () => {
  const tempHome = await createTempHome();

  for (const [binPath, argv, expectedAlias] of [
    [frontendBin, ["component", "--help"], "frontend"],
    [frontendBin, ["hook", "--help"], "frontend"],
    [backendBin, ["module", "--help"], "backend"]
  ]) {
    const result = runCli(binPath, argv, {
      env: {
        HOME: tempHome,
        USERPROFILE: tempHome
      }
    });

    assert.equal(result.status, 1);
    const payload = readJson(result.stderr);
    assert.equal(payload.error.code, "ACTIVE_PROFILE_NOT_SET");
    assert.equal(payload.error.details.alias, expectedAlias);
  }
});

test("active mode가 없으면 guide --help도 ACTIVE_PROFILE_NOT_SET으로 실패한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(frontendBin, ["guide", "--help"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "ACTIVE_PROFILE_NOT_SET");
  assert.equal(payload.error.details.alias, "frontend");
});

test("active mode가 없으면 일반 명령은 ACTIVE_PROFILE_NOT_SET으로 실패한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(frontendBin, [
    "component",
    "--json",
    "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}"
  ], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "ACTIVE_PROFILE_NOT_SET");
  assert.equal(payload.error.details.suggestedCommand, "frontend mode set --mode personal --version v1");
});

test("일반 명령의 --mode/--version override는 PROFILE_OVERRIDE_UNSUPPORTED로 실패한다", () => {
  const result = runCli(frontendBin, [
    "component",
    "--mode",
    "personal",
    "--version",
    "v2",
    "--json",
    "{\"name\":\"ReviewCard\",\"path\":\"components/common/reviewCard\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "PROFILE_OVERRIDE_UNSUPPORTED");
  assert.equal(payload.error.details.option, "mode");
});
