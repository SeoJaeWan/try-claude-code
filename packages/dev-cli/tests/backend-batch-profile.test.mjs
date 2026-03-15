import test from "node:test";
import assert from "node:assert/strict";

import { readJson, runCli, tcbBin } from "./test-utils.mjs";

test("tcb requestDto는 JSON spec으로 dry-run file plan을 만든다", () => {
  const result = runCli(tcbBin, [
    "requestDto",
    "--json",
    "{\"name\":\"CreateProductRequest\",\"path\":\"product\",\"basePackage\":\"com.example.app\",\"fields\":[{\"name\":\"name\",\"type\":\"String\",\"validations\":[\"NotBlank\"]}]}"
  ]);

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.files[0].status, "planned");
  assert.equal(
    payload.files[0].path,
    "src/main/java/com/example/app/product/dto/CreateProductRequest.java"
  );
});

test("tcb는 대문자 package path를 거부한다", () => {
  const result = runCli(tcbBin, [
    "module",
    "--json",
    "{\"name\":\"Product\",\"path\":\"Product\",\"basePackage\":\"com.example.app\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "INVALID_PACKAGE_SEGMENT");
});

test("tcb는 basePackage가 없으면 명시적인 root package 감지 실패를 반환한다", () => {
  const result = runCli(tcbBin, [
    "requestDto",
    "--json",
    "{\"name\":\"CreateProductRequest\",\"path\":\"product\"}"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "ROOT_PACKAGE_NOT_FOUND");
});
