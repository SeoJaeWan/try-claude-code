import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("BackendBatchProfile", () => {
  it("[C-BE-001] backend requestDto는 --json spec으로 dry-run file plan을 만든다", async () => {
    // Arrange
    const request = {
      ops: [
        {
          id: "request-dto",
          command: "requestDto",
          spec: {
            name: "CreateProductRequest",
            path: "product",
            basePackage: "com.example.app",
            fields: [
              { name: "name", type: "String", validations: ["NotBlank"] }
            ]
          }
        }
      ]
    };

    // Act
    const result = await subject.execute(request);

    // Assert
    assert.equal(result.ok, true);
    assert.equal(
      result.batchResults[0].files[0].path,
      "src/main/java/com/example/app/product/dto/CreateProductRequest.java"
    );
  });

  it("[C-BE-001] 대문자 package path나 root package 누락은 deterministic error를 반환한다", async () => {
    // Arrange
    const request = {
      ops: [
        {
          id: "bad-request-dto",
          command: "requestDto",
          spec: {
            name: "CreateProductRequest",
            path: "Product"
          }
        }
      ]
    };

    // Act
    const error = await subject.execute(request).catch((caught) => caught);

    // Assert
    assert.ok(["INVALID_PACKAGE_SEGMENT", "ROOT_PACKAGE_NOT_FOUND"].includes(error.code));
  });
});
