import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSpec, renderSnippet } from "../src/core/spec-normalizer.mjs";
import { loadProfile } from "./test-utils.mjs";

test("internalHandler 이름은 profile recipe 기준으로 정규화된다", async () => {
  const profile = await loadProfile("frontend");
  const command = profile.commands.function;
  const result = normalizeSpec({
    command,
    spec: {
      kind: "internalHandler",
      name: "onClick"
    }
  });

  assert.equal(result.normalizedSpec.name, "handleClick");
  assert.deepEqual(result.normalizations, [
    {
      field: "name",
      from: "onClick",
      to: "handleClick",
      reason: "internal handlers use handle*"
    }
  ]);
});

test("internalHandler 의도와 이름이 충돌하면 SPEC_CONFLICT로 실패한다", async () => {
  const profile = await loadProfile("frontend");
  const command = profile.commands.function;
  assert.throws(
    () =>
      normalizeSpec({
        command,
        spec: {
          kind: "internalHandler",
          name: "handleSubmit",
          action: "click"
        }
      }),
    (error) => error.code === "SPEC_CONFLICT"
  );
});

test("props command는 members only snippet을 만든다", async () => {
  const profile = await loadProfile("publisher");
  const command = profile.commands.props;
  const { normalizedSpec } = normalizeSpec({
    command,
    spec: {
      members: [
        {
          kind: "value",
          name: "title",
          type: "string",
          required: true
        },
        {
          kind: "callback",
          name: "handleClick",
          params: []
        }
      ]
    }
  });

  const snippet = await renderSnippet({
    command,
    normalizedSpec
  });

  assert.equal(snippet.kind, "snippet");
  assert.match(snippet.code, /title: string;/);
  assert.match(snippet.code, /onClick\?: \(\) => void;/);
  assert.doesNotMatch(snippet.code, /interface\s+/);
});

test("uiState는 state와 handler snippet을 함께 만든다", async () => {
  const profile = await loadProfile("publisher");
  const command = profile.commands.uiState;
  const { normalizedSpec } = normalizeSpec({
    command,
    spec: {
      category: "uiInteraction",
      pattern: "toggle",
      name: "menu"
    }
  });

  const snippet = await renderSnippet({
    command,
    normalizedSpec
  });

  assert.match(snippet.code, /const \[isMenuOpen, setIsMenuOpen\]/);
  assert.match(snippet.code, /const handleToggleMenu =/);
});
