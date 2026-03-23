import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGenerationRequest } from "../../../packages/dev-cli/src/core/profile-validator.mjs";

describe("frontendProfileValidator", () => {
  it("[C-CLI-004] frontend component 요청을 page/homePage/index.tsx 규칙으로 통과시킨다", () => {
    // Arrange
    const request = {
      profileId: "frontend/personal/v1",
      command: "component",
      name: "HomePage",
      path: "page/homePage",
      templateSource: "component",
    };

    // Act
    const result = validateGenerationRequest(request);

    // Assert
    assert.equal(result.ok, true);
    assert.equal(result.outputPattern, "page/homePage/index.tsx");
  });

  it("[C-CLI-004][C-CLI-006] frontend component 요청에 useEffect가 섞이면 생성 자체를 거부한다", () => {
    // Arrange
    const request = {
      profileId: "frontend/personal/v1",
      command: "component",
      name: "HomePage",
      path: "page/homePage",
      templateSource: "component-with-use-effect",
    };

    // Act
    const result = validateGenerationRequest(request);

    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.code, "FORBIDDEN_PATTERN");
    assert.equal(result.pattern, "useEffect(");
  });

  it("[C-CLI-004][C-CLI-006] frontend apiHook 경로가 queries/mutations 규칙을 벗어나면 거부한다", () => {
    // Arrange
    const request = {
      profileId: "frontend/personal/v1",
      command: "apiHook",
      name: "useGetProduct",
      path: "hooks/apis/product/query",
    };

    // Act
    const result = validateGenerationRequest(request);

    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.code, "INVALID_PATH_PATTERN");
  });
});
