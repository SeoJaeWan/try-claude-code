import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, tcpBin, tcfBin } from "./test-utils.mjs";

test("spec-driven command는 --json 입력을 받고 기본적으로 파일 preview를 반환한다", () => {
  const result = runCli(tcpBin, [
    "component",
    "--json",
    "{\"name\":\"HomePage\",\"path\":\"page/homePage\"}"
  ]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, "component");
  assert.equal(payload.normalizedSpec.name, "HomePage");
  assert.equal(payload.files[0].path, "page/homePage/index.tsx");
  assert.equal(payload.files[0].status, "planned");
});

test("legacy positional 입력은 명시적인 JSON spec 오류를 반환한다", () => {
  const result = runCli(tcpBin, [
    "component",
    "HomePage",
    "--path",
    "page/homePage"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "JSON_SPEC_REQUIRED");
});

test("성공 payload는 normalizedSpec과 snippet result 필드를 유지한다", () => {
  const result = runCli(tcfBin, [
    "function",
    "--json",
    "{\"kind\":\"internalHandler\",\"name\":\"onClick\"}"
  ]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.normalizedSpec.name, "handleClick");
  assert.equal(payload.result.kind, "snippet");
});

test("실패 payload도 deterministic error envelope를 유지한다", () => {
  const result = runCli(tcfBin, [
    "function",
    "--json",
    "{\"kind\":\"internalHandler\",\"name\":\"handleSubmit\",\"action\":\"click\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "SPEC_CONFLICT");
});
