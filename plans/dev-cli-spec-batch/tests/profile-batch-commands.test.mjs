import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("ProfileBatchCommands", () => {
  it("[C-SPEC-003] frontend profile은 UI/file/snippet command를 모두 노출한다", async () => {
    // Arrange
    const profile = await loadProfile("frontend/personal/v1");

    // Act
    const commandNames = Object.keys(profile.commands);

    // Assert
    assert.deepEqual(
      commandNames.sort(),
      ["apiHook", "component", "endpoint", "function", "hook", "hookReturn", "mapper", "props", "queryKey", "type", "uiState"].sort()
    );
  });

  it("[C-SPEC-003] 지원하지 않는 profile-command 조합은 deterministic error를 반환한다", async () => {
    // Arrange
    const batchRequest = {
      ops: [
        {
          id: "bad-ui-state",
          command: "uiState",
          spec: {
            category: "uiInteraction",
            pattern: "toggle",
            name: "menu"
          }
        }
      ]
    };

    // Act
    const error = await subject.execute("backend", batchRequest).catch((caught) => caught);

    // Assert
    assert.equal(error.code, "UNKNOWN_COMMAND");
  });
});
