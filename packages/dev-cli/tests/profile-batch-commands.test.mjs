import test from "node:test";
import assert from "node:assert/strict";

import { executeSpecCommand } from "../src/core/execution/batch-executor.mjs";
import { loadProfile, projectRoot } from "./test-utils.mjs";

test("frontend profile은 shared snippet, component, and hook commands를 함께 노출한다", async () => {
  const profile = await loadProfile("frontend");

  assert.deepEqual(
    Object.keys(profile.commands).sort(),
    [
      "apiHook",
      "batch",
      "component",
      "endpoint",
      "function",
      "hook",
      "hookReturn",
      "mapper",
      "props",
      "queryKey",
      "type",
      "uiState",
      "validateFile"
    ].sort()
  );
});

test("지원하지 않는 profile-command 조합은 deterministic error로 실패한다", async () => {
  const profile = await loadProfile("frontend");

  await assert.rejects(
    () =>
      executeSpecCommand({
        profile,
        profileId: profile.id,
        commandName: "module",
        spec: {
          name: "Orders",
          path: "orders"
        },
        projectRoot
      }),
    (error) => error.code === "UNKNOWN_COMMAND"
  );
});
