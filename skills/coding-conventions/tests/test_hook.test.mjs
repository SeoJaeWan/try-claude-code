import assert from "node:assert/strict";
import test from "node:test";

import { generateHook } from "../scripts/generators/hook.mjs";

test("basic hook generation", () => {
  const result = generateHook("useCounter");
  assert.ok("hook" in result);
  assert.ok("test" in result);
  assert.match(result.hook, /const useCounter = \(\)/);
  assert.match(result.hook, /export default useCounter/);
});

test("form hook with state", () => {
  const result = generateHook("useLoginForm", "form", "email:string,password:string");
  assert.match(result.hook, /useState/);
  assert.match(result.hook, /email/);
  assert.match(result.hook, /password/);
  assert.match(result.hook, /handleChange/);
});

test("hook with jsdoc", () => {
  const result = generateHook("useDebounce", "util", null, true);
  assert.match(result.hook, /\/\*\*/);
  assert.match(result.hook, /\* useDebounce 훅/);
});

test("hook test generation", () => {
  const result = generateHook("useCounter", "util", null, true, true);
  assert.match(result.test, /describe\('useCounter'/);
  assert.match(result.test, /renderHook/);
  assert.match(result.test, /\/\/ Arrange/);
  assert.match(result.test, /\/\/ Assert/);
});

test("form hook test", () => {
  const result = generateHook("useLoginForm", "form", "email:string", true, true);
  assert.match(result.test, /초기 상태는 빈 문자열이다/);
  assert.match(result.test, /handleChange 호출 시 폼 상태가 업데이트된다/);
  assert.match(result.test, /\/\/ Arrange/);
  assert.match(result.test, /\/\/ Act/);
  assert.match(result.test, /\/\/ Assert/);
});

test("hook folder structure", () => {
  const result = generateHook("useLoginForm");
  assert.equal(result.folder, "useLoginForm/");
  assert.equal(result.hook_file, "index.ts");
  assert.equal(result.test_file, "__tests__/index.test.ts");
});

test("name auto-correction missing use prefix", () => {
  const result = generateHook("counter");
  assert.match(result.hook, /const useCounter = \(\)/);
  assert.match(result.hook, /export default useCounter/);
  assert.equal(result.folder, "useCounter/");
});

test("name auto-correction from kebab", () => {
  const result = generateHook("login-form");
  assert.match(result.hook, /const useLoginForm = \(\)/);
  assert.equal(result.folder, "useLoginForm/");
});

test("name auto-correction from pascal", () => {
  const result = generateHook("LoginForm");
  assert.match(result.hook, /const useLoginForm = \(\)/);
});

