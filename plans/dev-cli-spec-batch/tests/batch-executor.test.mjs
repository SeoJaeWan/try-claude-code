import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("BatchExecutor", () => {
  it("[C-BATCH-001] ordered ops를 한 번의 요청에서 순서대로 처리한다", async () => {
    // Arrange
    const request = {
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
              { kind: "value", name: "title", type: "string", required: true }
            ]
          }
        }
      ]
    };

    // Act
    const result = await subject.execute(request);

    // Assert
    assert.equal(result.ok, true);
    assert.deepEqual(result.batchResults.map((item) => item.id), ["component", "props"]);
  });

  it("[C-BATCH-002] --apply 없이 실행하면 write plan만 만들고 파일을 쓰지 않는다", async () => {
    // Arrange
    const request = {
      apply: false,
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
    };

    // Act
    const result = await subject.execute(request);

    // Assert
    assert.equal(result.ok, true);
    assert.equal(result.apply, false);
    assert.equal(result.files[0].status, "planned");
  });

  it("[C-BATCH-004] 중간 op가 실패하면 이후 op를 실행하지 않고 실제 write를 막는다", async () => {
    // Arrange
    const request = {
      apply: true,
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
          id: "bad-props",
          command: "props",
          spec: {
            members: [
              { kind: "callback", name: "handleClick", params: [] }
            ]
          }
        }
      ]
    };

    // Act
    const error = await subject.execute(request).catch((caught) => caught);

    // Assert
    assert.equal(error.code, "SPEC_CONFLICT");
    assert.equal(fileWriterSpy.writeCount, 0);
  });
});
