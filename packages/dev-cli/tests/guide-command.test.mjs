import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, frontendBin } from "./test-utils.mjs";

test("기본 help payload는 탐색용 summary JSON을 반환한다", () => {
  const result = runCli(frontendBin, ["--help"]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.helpMode, "summary");
  assert.equal("rules" in payload, false);
  assert.equal(payload.commands.component.detailHelp, "frontend component --help");
  assert.match(
    payload.commands.component.whenToUse[0],
    /When you need a new UI component shell/
  );
  assert.equal(payload.flows["create-component"].steps[0].command, "component");
});


test("legacy help subcommand 문법은 일반 unknown command로 실패한다", () => {
  const result = runCli(frontendBin, ["help", "component"]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
  assert.equal(payload.error.details.command, "help");
});

