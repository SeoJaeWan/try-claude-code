import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, tcpBin, tcfBin } from "./test-utils.mjs";

test("tcp guide --html은 publisher explorer HTML을 반환한다", () => {
  const result = runCli(tcpBin, ["guide", "--html"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /<!DOCTYPE html>/);
  assert.match(result.stdout, /publisher-guide-page/);
  assert.match(result.stdout, /publisher\/personal\/v1/);
});

test("tcp guide component --html은 선택한 command section만 렌더한다", () => {
  const result = runCli(tcpBin, ["guide", "component", "--html"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /publisher-guide-command-component/);
  assert.doesNotMatch(result.stdout, /publisher-guide-command-uiState/);
});

test("publisher 이외 alias에서 --html을 요청하면 deterministic unsupported error를 반환한다", () => {
  const result = runCli(tcfBin, ["guide", "--html"]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "HTML_GUIDE_UNSUPPORTED");
});
