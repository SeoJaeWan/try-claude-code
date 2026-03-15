import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGenerationRequest } from "../../../packages/dev-cli/src/core/profile-validator.mjs";

describe("backendProfileValidator", () => {
  it("[C-CLI-005] Spring module 요청을 root package 아래 feature 구조로 해석한다", () => {
    // Arrange
    const request = {
      profileId: "backend/personal/v1",
      command: "module",
      name: "Product",
      path: "product",
      basePackage: "com.example.app",
    };

    // Act
    const result = validateGenerationRequest(request);

    // Assert
    assert.equal(result.ok, true);
    assert.deepEqual(result.directories, [
      "src/main/java/com/example/app/product/controller",
      "src/main/java/com/example/app/product/service",
      "src/main/java/com/example/app/product/dto",
      "src/main/java/com/example/app/product/entity",
      "src/main/java/com/example/app/product/repository",
    ]);
  });

  it("[C-CLI-005][C-CLI-006] backend package path가 대문자를 포함하면 거부한다", () => {
    // Arrange
    const request = {
      profileId: "backend/personal/v1",
      command: "module",
      name: "Product",
      path: "ProductAdmin",
      basePackage: "com.example.app",
    };

    // Act
    const result = validateGenerationRequest(request);

    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.code, "INVALID_PACKAGE_PATH");
  });

  it("[C-CLI-005][C-CLI-006] root package를 찾지 못하면 Spring baseline 생성에 실패한다", () => {
    // Arrange
    const request = {
      profileId: "backend/personal/v1",
      command: "module",
      name: "Product",
      path: "product",
      basePackage: null,
    };

    // Act
    const result = validateGenerationRequest(request);

    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.code, "ROOT_PACKAGE_NOT_FOUND");
  });
});
