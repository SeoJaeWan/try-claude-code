import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSpec, renderSnippet } from "../src/core/spec-normalizer.mjs";

test("internalHandler 이름은 handle 규칙으로 정규화된다", () => {
  const result = normalizeSpec({
    role: "frontend",
    commandName: "function",
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

test("internalHandler 의도와 이름이 충돌하면 SPEC_CONFLICT로 실패한다", () => {
  assert.throws(
    () =>
      normalizeSpec({
        role: "frontend",
        commandName: "function",
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
  const { normalizedSpec } = normalizeSpec({
    role: "publisher",
    commandName: "props",
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
    command: {},
    commandName: "props",
    normalizedSpec
  });

  assert.equal(snippet.kind, "snippet");
  assert.match(snippet.code, /title: string;/);
  assert.match(snippet.code, /onClick\?: \(\) => void;/);
  assert.doesNotMatch(snippet.code, /interface\s+/);
});

test("uiState는 state와 handler snippet을 함께 만든다", async () => {
  const { normalizedSpec } = normalizeSpec({
    role: "publisher",
    commandName: "uiState",
    spec: {
      category: "uiInteraction",
      pattern: "toggle",
      name: "menu"
    }
  });

  const snippet = await renderSnippet({
    command: {},
    commandName: "uiState",
    normalizedSpec
  });

  assert.match(snippet.code, /const \[isMenuOpen, setIsMenuOpen\]/);
  assert.match(snippet.code, /const handleToggleMenu =/);
});
