import test from "node:test";
import assert from "node:assert/strict";

import { executeSpecCommand } from "../src/core/execution/batch-executor.mjs";
import { loadManifest, projectRoot } from "./test-utils.mjs";

test("frontend manifest는 batch 없이 핵심 commands를 노출한다", () => {
  const manifest = loadManifest("frontend");
  const keys = Object.keys(manifest.commands).sort();

  assert.ok(!keys.includes("batch"), "batch는 frontend manifest에서 제거되어야 한다");
  assert.ok(keys.includes("component"), "component는 여전히 노출되어야 한다");
  assert.ok(keys.includes("apiHook"), "apiHook은 여전히 노출되어야 한다");
  assert.ok(keys.includes("validateFile"), "validateFile은 여전히 노출되어야 한다");
});

test("backend manifest는 batch 없이 핵심 commands를 노출한다", () => {
  const manifest = loadManifest("backend");
  const keys = Object.keys(manifest.commands).sort();

  assert.ok(!keys.includes("batch"), "batch는 backend manifest에서 제거되어야 한다");
});

test("frontend batch command는 UNKNOWN_COMMAND로 deterministic하게 실패한다", async () => {
  const manifest = loadManifest("frontend");

  await assert.rejects(
    () =>
      executeSpecCommand({
        profile: manifest,
        profileId: manifest.id,
        commandName: "batch",
        spec: { ops: [] },
        projectRoot
      }),
    (error) => error.code === "UNKNOWN_COMMAND"
  );
});

test("backend batch command는 UNKNOWN_COMMAND로 deterministic하게 실패한다", async () => {
  const manifest = loadManifest("backend");

  await assert.rejects(
    () =>
      executeSpecCommand({
        profile: manifest,
        profileId: manifest.id,
        commandName: "batch",
        spec: { ops: [] },
        projectRoot
      }),
    (error) => error.code === "UNKNOWN_COMMAND"
  );
});

test("지원하지 않는 manifest-command 조합은 deterministic error로 실패한다", async () => {
  const manifest = loadManifest("frontend");

  await assert.rejects(
    () =>
      executeSpecCommand({
        profile: manifest,
        profileId: manifest.id,
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
