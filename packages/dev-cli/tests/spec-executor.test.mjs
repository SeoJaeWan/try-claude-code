import test from "node:test";
import assert from "node:assert/strict";

import { executeSpecCommand } from "../src/core/execution/spec-executor.mjs";
import { loadManifest, projectRoot } from "./test-utils.mjs";

test("executeSpecCommand은 유효한 spec으로 ok:true 결과를 반환한다", async () => {
  const manifest = loadManifest("frontend");

  const result = await executeSpecCommand({
    profile: manifest,
    profileId: manifest.id,
    commandName: "component",
    spec: {
      name: "HomePage",
      path: "components/home/homePage"
    },
    projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.command, "component");
  assert.ok(Array.isArray(result.files));
  assert.ok(result.files[0].path.includes("homePage"));
});

test("executeSpecCommand은 manifest에 없는 command에 UNKNOWN_COMMAND 오류를 반환한다", async () => {
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

test("executeSpecCommand은 snippet 실행 command에 snippet result를 반환한다", async () => {
  const manifest = loadManifest("frontend");

  const result = await executeSpecCommand({
    profile: manifest,
    profileId: manifest.id,
    commandName: "function",
    spec: {
      kind: "internalHandler",
      name: "onClick"
    },
    projectRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.result.kind, "snippet");
});
