import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SpecNormalizer", () => {
  it("[C-SPEC-002] internalHandler 이름을 handle 규칙으로 정규화한다", () => {
    // Arrange
    const spec = {
      kind: "internalHandler",
      name: "onClick"
    };

    // Act
    const result = subject.normalize(spec);

    // Assert
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

  it("[C-SPEC-002] 의도와 이름이 충돌하면 실패한다", () => {
    // Arrange
    const spec = {
      kind: "propCallback",
      name: "handleClick"
    };

    // Act
    const error = assert.throws(() => subject.normalize(spec));

    // Assert
    assert.match(String(error), /SPEC_CONFLICT/);
  });

  it("[C-SPEC-005] props command는 membersOnly 형태로 결과를 만든다", () => {
    // Arrange
    const spec = {
      members: [
        { kind: "value", name: "title", type: "string", required: true }
      ]
    };

    // Act
    const result = subject.renderProps(spec);

    // Assert
    assert.equal(result.kind, "snippet");
    assert.match(result.code, /title: string;/);
    assert.doesNotMatch(result.code, /interface\s+/);
  });

  it("[C-SPEC-005] uiState는 state와 handler를 함께 생성한다", () => {
    // Arrange
    const spec = {
      category: "uiInteraction",
      pattern: "toggle",
      name: "menu"
    };

    // Act
    const result = subject.renderUiState(spec);

    // Assert
    assert.match(result.code, /const \[isMenuOpen, setIsMenuOpen\]/);
    assert.match(result.code, /const handleToggleMenu =/);
  });
});
