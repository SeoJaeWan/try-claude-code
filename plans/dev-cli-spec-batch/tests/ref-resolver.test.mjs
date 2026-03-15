import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("RefResolver", () => {
  it("[C-BATCH-003] 앞 op 결과를 뒤 op spec에서 참조할 수 있다", () => {
    // Arrange
    const priorResults = {
      component: {
        normalizedSpec: {
          name: "HomePage"
        }
      }
    };

    const spec = {
      componentName: {
        $ref: "component.normalizedSpec.name"
      }
    };

    // Act
    const resolved = subject.resolve(spec, priorResults);

    // Assert
    assert.equal(resolved.componentName, "HomePage");
  });

  it("[C-BATCH-003] 아직 생성되지 않은 op를 참조하면 실패한다", () => {
    // Arrange
    const priorResults = {};
    const spec = {
      componentName: {
        $ref: "component.normalizedSpec.name"
      }
    };

    // Act
    const error = assert.throws(() => subject.resolve(spec, priorResults));

    // Assert
    assert.match(String(error), /INVALID_REF/);
  });
});
