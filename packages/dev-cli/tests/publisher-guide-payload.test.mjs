import test from "node:test";
import assert from "node:assert/strict";

import { createPublisherGuideModel } from "../src/core/publisher-guide-model.mjs";
import { loadProfile } from "./test-utils.mjs";

test("publisher guide model은 profile guide와 command contract를 한 구조로 조립한다", async () => {
  const profile = await loadProfile("publisher");
  const model = createPublisherGuideModel({
    alias: "tcp",
    role: "publisher",
    activeProfile: {
      mode: "personal",
      version: "v1",
      source: "explicit"
    },
    profile
  });

  assert.equal(model.readOnly, true);
  assert.equal(model.profile.id, "publisher/personal/v1");
  assert.match(model.profile.summary, /퍼블리셔 personal v1 규칙/);
  assert.equal(model.profile.groups.some((group) => group.id === "guide"), true);
  assert.equal(model.profile.groups.some((group) => group.id === "rules"), true);
  assert.equal(model.sections.some((section) => section.id === "component"), true);

  const componentSection = model.sections.find((section) => section.id === "component");
  assert.equal(componentSection.groups.some((group) => group.id === "guide"), true);
  assert.equal(componentSection.groups.some((group) => group.id === "contracts"), true);
  assert.equal(componentSection.groups.some((group) => group.id === "normalization"), true);
  assert.equal(componentSection.groups.some((group) => group.id === "validators"), true);
  assert.equal(componentSection.groups.some((group) => group.id === "render"), true);
  assert.equal(componentSection.groups.some((group) => group.id === "examples"), true);
});

test("read-only scope의 guide model은 edit/save/version action을 노출하지 않는다", async () => {
  const profile = await loadProfile("publisher");
  const model = createPublisherGuideModel({
    alias: "tcp",
    role: "publisher",
    activeProfile: {
      mode: "personal",
      version: "v1",
      source: "explicit"
    },
    profile
  });

  assert.equal(model.readOnly, true);
  assert.equal("actions" in model, false);
  assert.equal("versioning" in model, false);
});

test("optional group가 비어 있으면 빈 placeholder 대신 해당 group을 생략한다", () => {
  const model = createPublisherGuideModel({
    alias: "tcp",
    role: "publisher",
    activeProfile: {
      mode: "personal",
      version: "v1",
      source: "explicit"
    },
    profile: {
      id: "publisher/personal/v1",
      guide: {
        요약: "테스트용 publisher profile"
      },
      rules: {},
      commands: {
        batch: {
          description: "Execute multiple publisher ops in one request",
          guide: {
            목적: "테스트용 배치"
          },
          inputMode: "json",
          execution: {
            kind: "batch"
          },
          render: {},
          examples: []
        }
      }
    }
  });

  const batchSection = model.sections.find((section) => section.id === "batch");
  assert.equal(batchSection.groups.some((group) => group.id === "guide"), true);
  assert.equal(batchSection.groups.some((group) => group.id === "contracts"), false);
  assert.equal(batchSection.groups.some((group) => group.id === "normalization"), false);
  assert.equal(batchSection.groups.some((group) => group.id === "validators"), false);
  assert.equal(batchSection.groups.some((group) => group.id === "render"), false);
  assert.equal(batchSection.groups.some((group) => group.id === "examples"), false);
});
