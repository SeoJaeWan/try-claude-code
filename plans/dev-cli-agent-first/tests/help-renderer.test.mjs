import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderHelp } from "../../../packages/dev-cli/src/core/help-renderer.mjs";

describe("helpRenderer", () => {
  it("[C-CLI-002] 기본 help 요청이면 JSON payload를 반환한다", () => {
    // Arrange
    const profile = {
      id: "frontend/personal/v1",
      alias: "frontend",
      commands: [{ name: "component" }],
    };

    // Act
    const result = renderHelp(profile, {});

    // Assert
    assert.equal(result.format, "json");
    assert.equal(result.payload.alias, "frontend");
    assert.equal(Array.isArray(result.payload.commands), true);
  });

  it("[C-CLI-002] text format만 명시했을 때 사람용 help로 렌더링한다", () => {
    // Arrange
    const profile = {
      id: "frontend/personal/v1",
      alias: "frontend",
      commands: [{ name: "hook", description: "Generate a hook" }],
    };

    // Act
    const result = renderHelp(profile, { text: true });

    // Assert
    assert.equal(result.format, "text");
    assert.match(result.payload, /frontend/);
    assert.match(result.payload, /hook/);
  });
});

