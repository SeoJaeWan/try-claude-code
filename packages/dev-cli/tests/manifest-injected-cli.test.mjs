import test from "node:test";
import assert from "node:assert/strict";

import { createTempHome, readJson, runCli, frontendBin, backendBin } from "./test-utils.mjs";

/**
 * Phase 3 rebaseline:
 *
 * Both frontend and backend bins now inject a package-owned manifest into the
 * core runtime.  The legacy bootstrap / ACTIVE_PROFILE_NOT_SET path no longer
 * applies to either binary — they always have their manifest available.
 */

test("frontend --help는 manifest에서 summary JSON을 반환한다 (no active mode required)", async () => {
  const tempHome = await createTempHome();
  const result = runCli(frontendBin, ["--help"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal(payload.alias, "frontend");
  assert.ok(payload.commands.component, "component 명령이 있어야 한다");
});

test("frontend component --help는 mode 없이도 detail JSON을 반환한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(frontendBin, ["component", "--help"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "detail");
  assert.ok(payload.commands.component, "component 명령이 있어야 한다");
});

test("frontend 일반 명령은 mode 없이 manifest에서 실행된다", async () => {
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

  // manifest path: no mode required, command executes immediately
  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.alias, "frontend");
});

test("frontend --mode/--version 옵션은 UNKNOWN_OPTION으로 deterministic하게 실패한다", () => {
  // manifest dispatcher validates allowed options on execute path
  // --mode/--version are removed options and must not be silently ignored
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
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "UNKNOWN_OPTION");
});

test("backend --help는 manifest에서 summary JSON을 반환한다 (no active mode required)", async () => {
  const tempHome = await createTempHome();
  const result = runCli(backendBin, ["--help"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal(payload.alias, "backend");
  assert.ok(payload.commands.module, "module 명령이 있어야 한다");
});

test("backend module --help는 mode 없이도 detail JSON을 반환한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(backendBin, ["module", "--help"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "detail");
  assert.ok(payload.commands.module, "module 명령이 있어야 한다");
});
