import test from "node:test";
import assert from "node:assert/strict";

import { executeSpecCommand } from "../src/core/batch-executor.mjs";
import { loadProfile, repoRoot } from "./test-utils.mjs";

test("publisher profile은 shared snippet command와 component uiState batch를 함께 노출한다", async () => {
  const profile = await loadProfile("publisher");

  assert.deepEqual(
    Object.keys(profile.commands).sort(),
    ["batch", "component", "function", "props", "type", "uiState", "validateFile"].sort()
  );
});

test("frontend profile은 계획된 file command와 snippet command를 모두 노출한다", async () => {
  const profile = await loadProfile("frontend");

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
  const profile = await loadProfile("frontend");

  await assert.rejects(
    () =>
      executeSpecCommand({
        profile,
        profileId: profile.id,
        role: "frontend",
        commandName: "uiState",
        spec: {
          category: "uiInteraction",
          pattern: "toggle",
          name: "menu"
        },
        repoRoot
      }),
    (error) => error.code === "UNKNOWN_COMMAND"
  );
});
