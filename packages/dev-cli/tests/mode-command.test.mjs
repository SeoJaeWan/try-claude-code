import test from "node:test";
import assert from "node:assert/strict";

import { createTempHome, readJson, runCli, frontendBin, backendBin } from "./test-utils.mjs";

/**
 * Phase 3 rebaseline:
 *
 * Both frontend and backend bins now use the manifest path.  The `mode`
 * command is not part of the manifest surface, so all `backend mode *` and
 * `frontend mode *` calls return UNKNOWN_COMMAND.
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

// ---- backend mode commands return UNKNOWN_COMMAND (manifest path) ----

test("backend mode set/show는 manifest 경로에서 UNKNOWN_COMMAND로 실패한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(backendBin, ["mode", "set", "--mode", "personal", "--version", "v1"], {
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

test("backend mode show는 manifest 경로에서 UNKNOWN_COMMAND로 실패한다", async () => {
  const tempHome = await createTempHome();
  const result = runCli(backendBin, ["mode", "show"], {
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome
    }
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
});
