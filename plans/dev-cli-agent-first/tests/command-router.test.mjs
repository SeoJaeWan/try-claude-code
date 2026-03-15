import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeCommand } from "../../../packages/dev-cli/src/core/command-router.mjs";

describe("commandRouter", () => {
  it("[C-CLI-001] tcp alias 요청을 publisher component command로 라우팅한다", () => {
    // Arrange
    const argv = ["tcp", "component", "HomePage", "--path", "page/homePage", "--dry-run"];

    // Act
    const result = routeCommand(argv);

    // Assert
    assert.equal(result.alias, "tcp");
    assert.equal(result.profileKind, "publisher");
    assert.equal(result.command, "component");
    assert.equal(result.options.path, "page/homePage");
    assert.equal(result.options["dry-run"], true);
  });

  it("[C-CLI-001] 지원하지 않는 alias 또는 command면 deterministic error를 반환한다", () => {
    // Arrange
    const argv = ["tcz", "component", "HomePage"];

    // Act
    const result = routeCommand(argv);

    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.code, "UNKNOWN_COMMAND");
    assert.equal(result.format, "json");
  });
});

