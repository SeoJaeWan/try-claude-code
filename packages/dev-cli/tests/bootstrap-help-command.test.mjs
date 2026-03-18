import test from "node:test";
import assert from "node:assert/strict";

import { createTempHome, readJson, runCli, tcpBin } from "./test-utils.mjs";

test("active mode가 없으면 tcp --help는 bootstrap help JSON을 반환한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(tcpBin, ["--help"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.helpMode, "bootstrap");
  assert.equal(payload.configured, false);
  assert.equal(payload.suggestedCommand, "tcp mode set --mode personal --version v1");
  assert.equal(payload.commands.component.setupRequired, true);
});

test("active mode가 없으면 command-scoped help --text도 setup 안내를 포함한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(tcpBin, ["help", "component", "--text"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /mode: not configured/);
  assert.match(result.stdout, /setup: tcp mode set --mode personal --version v1/);
  assert.match(result.stdout, /component: Generate a publisher UI component file/);
});

test("active mode가 없으면 일반 명령은 ACTIVE_PROFILE_NOT_SET으로 실패한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(tcpBin, [
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
  assert.equal(payload.error.details.suggestedCommand, "tcp mode set --mode personal --version v1");
});

test("일반 명령의 --mode/--version override는 PROFILE_OVERRIDE_UNSUPPORTED로 실패한다", () => {
  const result = runCli(tcpBin, [
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
