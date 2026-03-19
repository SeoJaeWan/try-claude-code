import test from "node:test";
import assert from "node:assert/strict";

import { executeSpecCommand } from "../src/core/execution/batch-executor.mjs";
import { loadProfile, projectRoot } from "./test-utils.mjs";

test("publisher profile은 shared snippet command와 component uiState batch를 함께 노출한다", async () => {
  const profile = await loadProfile("tcp");

  assert.deepEqual(
    Object.keys(profile.commands).sort(),
    ["batch", "component", "function", "props", "type", "uiState", "validateFile"].sort()
  );
});

test("frontend profile은 계획된 file command와 snippet command를 모두 노출한다", async () => {
  const profile = await loadProfile("tcf");

  assert.deepEqual(
    Object.keys(profile.commands).sort(),
    [
      "apiHook",
      "batch",
      "endpoint",
      "function",
      "hook",
      "hookReturn",
      "mapper",
      "props",
      "queryKey",
      "type",
      "validateFile"
    ].sort()
  );
});

test("지원하지 않는 profile-command 조합은 deterministic error로 실패한다", async () => {
  const profile = await loadProfile("tcf");

  await assert.rejects(
    () =>
      executeSpecCommand({
        profile,
        profileId: profile.id,
        commandName: "uiState",
        spec: {
          category: "uiInteraction",
          pattern: "toggle",
          name: "menu"
        },
        projectRoot
      }),
    (error) => error.code === "UNKNOWN_COMMAND"
  );
});
