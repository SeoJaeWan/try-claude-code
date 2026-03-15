import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("JsonCommandContract", () => {
  it("[C-SPEC-001] spec-driven command는 --json 입력만 허용한다", async () => {
    // Arrange
    const argv = ["component", "--json", "{\"name\":\"HomePage\",\"path\":\"page/homePage\"}"];

    // Act
    const result = await subject.run(argv);

    // Assert
    assert.equal(result.ok, true);
    assert.equal(result.command, "component");
  });

  it("[C-SPEC-001] legacy positional 입력은 명시적 usage error를 반환한다", async () => {
    // Arrange
    const argv = ["component", "HomePage", "--path", "page/homePage"];

    // Act
    const error = await subject.run(argv).catch((caught) => caught);

    // Assert
    assert.equal(error.code, "JSON_SPEC_REQUIRED");
  });

  it("[C-SPEC-004] 성공 응답은 normalizedSpec과 result/files 필드를 유지한다", async () => {
    // Arrange
    const argv = ["function", "--json", "{\"kind\":\"internalHandler\",\"name\":\"onClick\"}"];

    // Act
    const result = await subject.run(argv);

    // Assert
    assert.equal(result.ok, true);
    assert.ok(result.normalizedSpec);
    assert.ok(result.result || result.files);
  });

  it("[C-SPEC-004] 실패 응답도 같은 JSON envelope 규약을 유지한다", async () => {
    // Arrange
    const argv = ["function", "--json", "{\"kind\":\"internalHandler\",\"name\":\"onClick\",\"action\":\"submit\"}"];

    // Act
    const error = await subject.run(argv).catch((caught) => caught);

    // Assert
    assert.equal(error.ok, false);
    assert.ok(error.error);
  });
});
