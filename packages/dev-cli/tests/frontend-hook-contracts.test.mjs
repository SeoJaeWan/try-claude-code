import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, frontendBin } from "./test-utils.mjs";

test("custom hook는 hooks/utils/{domain} 또는 hooks/utils/common 경로만 허용한다", () => {
  const result = runCli(frontendBin, [
    "hook",
    "--json",
    "{\"name\":\"useLoginForm\",\"path\":\"hooks/login\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_HOOK_PATH");
});

test("api query hook는 hooks/apis/{domain}/queries 경로와 useGet* 이름을 강제한다", () => {
  const result = runCli(frontendBin, [
    "apiHook",
    "--json",
    "{\"name\":\"useFetchOrderDetail\",\"path\":\"hooks/apis/order/queries\",\"kind\":\"query\",\"method\":\"GET\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_HOOK_NAME");
});

test("api mutation hook는 REST method 기반 이름을 강제한다", () => {
  const result = runCli(frontendBin, [
    "apiHook",
    "--json",
    "{\"name\":\"useLogin\",\"path\":\"hooks/apis/auth/mutations\",\"kind\":\"mutation\",\"method\":\"POST\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_HOOK_NAME");
});

test("api mutation hook는 method와 kind 조합도 검증한다", () => {
  const result = runCli(frontendBin, [
    "apiHook",
    "--json",
    "{\"name\":\"usePostLogin\",\"path\":\"hooks/apis/auth/mutations\",\"kind\":\"mutation\",\"method\":\"GET\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_API_METHOD");
});

test("apiHook는 method가 없으면 이름 prefix에서 HTTP method를 추론한다", () => {
  const result = runCli(frontendBin, [
    "apiHook",
    "--json",
    "{\"name\":\"usePostLogin\",\"path\":\"hooks/apis/auth/mutations\",\"kind\":\"mutation\"}"
  ]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.files[0].path, "hooks/apis/auth/mutations/usePostLogin/index.ts");
});
