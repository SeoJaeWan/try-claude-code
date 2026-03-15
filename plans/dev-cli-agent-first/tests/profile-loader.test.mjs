import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveActiveProfile } from "../../../packages/dev-cli/src/core/profile-loader.mjs";

describe("profileLoader", () => {
  it("[C-CLI-003] 명시 옵션이 repo pin과 global default보다 우선한다", () => {
    // Arrange
    const input = {
      explicit: { kind: "frontend", mode: "personal", version: "v1" },
      repoPin: { kind: "publisher", mode: "personal", version: "v1" },
      globalDefault: { kind: "backend", mode: "personal", version: "v1" },
    };

    // Act
    const result = resolveActiveProfile(input);

    // Assert
    assert.equal(result.kind, "frontend");
    assert.equal(result.mode, "personal");
    assert.equal(result.version, "v1");
  });

  it("[C-CLI-003] 선택된 profile이 repo에 없으면 명시적 실패를 반환한다", () => {
    // Arrange
    const input = {
      explicit: { kind: "frontend", mode: "personal", version: "v9" },
      repoPin: null,
      globalDefault: null,
    };

    // Act
    const result = resolveActiveProfile(input);

    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.code, "PROFILE_NOT_FOUND");
    assert.match(result.message, /frontend\/personal\/v9/);
  });
});

