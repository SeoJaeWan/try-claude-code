import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { executeBatch } from "../src/core/batch-executor.mjs";
import { loadProfile } from "./test-utils.mjs";

test("batch executor는 op를 순서대로 실행하고 결과 순서를 유지한다", async () => {
  const profile = await loadProfile("publisher");
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-batch-"));

  const result = await executeBatch({
    profile,
    profileId: profile.id,
    role: "publisher",
    batchSpec: {
      ops: [
        {
          id: "component",
          command: "component",
          spec: {
            name: "HomePage",
            path: "page/homePage"
          }
        },
        {
          id: "props",
          command: "props",
          spec: {
            members: [
              {
                kind: "value",
                name: "title",
                type: "string",
                required: true
              }
            ]
          }
        }
      ]
    },
    repoRoot: tempRoot,
    apply: false,
    force: false
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.batchResults.map((item) => item.id),
    ["component", "props"]
  );
});

test("batch executor는 기본적으로 preview 모드로 동작하고 파일을 쓰지 않는다", async () => {
  const profile = await loadProfile("publisher");
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-batch-"));
  const targetPath = path.join(tempRoot, "page", "homePage", "index.tsx");

  const result = await executeBatch({
    profile,
    profileId: profile.id,
    role: "publisher",
    batchSpec: {
      ops: [
        {
          id: "component",
          command: "component",
          spec: {
            name: "HomePage",
            path: "page/homePage"
          }
        }
      ]
    },
    repoRoot: tempRoot,
    apply: false,
    force: false
  });

  assert.equal(result.apply, false);
  assert.equal(result.files[0].status, "planned");
  await assert.rejects(() => access(targetPath));
});

test("batch executor는 뒤 op가 실패하면 전체 write를 막는다", async () => {
  const profile = await loadProfile("publisher");
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dev-cli-batch-"));
  const targetPath = path.join(tempRoot, "page", "homePage", "index.tsx");

  await assert.rejects(
    () =>
      executeBatch({
        profile,
        profileId: profile.id,
        role: "publisher",
        batchSpec: {
          ops: [
            {
              id: "component",
              command: "component",
              spec: {
                name: "HomePage",
                path: "page/homePage"
              }
            },
            {
              id: "bad-function",
              command: "function",
              spec: {
                kind: "internalHandler",
                name: "handleSubmit",
                action: "click"
              }
            }
          ]
        },
        repoRoot: tempRoot,
        apply: true,
        force: false
      }),
    (error) => error.code === "SPEC_CONFLICT"
  );

  await assert.rejects(() => access(targetPath));
});
