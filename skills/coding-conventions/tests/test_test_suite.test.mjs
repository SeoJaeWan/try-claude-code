import assert from "node:assert/strict";
import test from "node:test";

import { generateTestSuite } from "../scripts/generators/test_suite.mjs";

test("hook test suite generation", () => {
  const result = generateTestSuite("useLogin", "hook");
  assert.match(result.test, /describe\('useLogin'/);
  assert.match(result.test, /it\('/);
  assert.match(result.test, /renderHook/);
  assert.match(result.test, /act/);
  assert.match(result.test, /\/\/ Arrange/);
  assert.match(result.test, /\/\/ Act/);
  assert.match(result.test, /\/\/ Assert/);
});

test("component test suite generation", () => {
  const result = generateTestSuite("Button", "component");
  assert.match(result.test, /render/);
  assert.match(result.test, /container\.firstChild/);
  assert.match(result.test, /\/\/ Arrange/);
  assert.match(result.test, /\/\/ Act/);
  assert.match(result.test, /\/\/ Assert/);
});

test("function test suite generation", () => {
  const result = generateTestSuite("formatDate", "function");
  assert.match(result.test, /describe\('formatDate'/);
  assert.match(result.test, /it\('/);
  assert.match(result.test, /\/\/ Arrange/);
  assert.match(result.test, /\/\/ Act/);
  assert.match(result.test, /\/\/ Assert/);
});

test("korean specs", () => {
  const result = generateTestSuite("useLogin", "hook");
  assert.match(result.test, /정상적으로/);
  assert.match(result.test, /동작한다/);
});

test("without arrange", () => {
  const result = generateTestSuite("useLogin", "hook", null, false);
  assert.match(result.test, /\/\/ Act/);
  assert.match(result.test, /\/\/ Assert/);
});

test("hook name auto-correction", () => {
  const result = generateTestSuite("login", "hook");
  assert.match(result.test, /describe\('useLogin'/);
  assert.match(result.test, /useLogin\(\)/);
});

test("component name auto-correction", () => {
  const result = generateTestSuite("login-form", "component");
  assert.match(result.test, /describe\('LoginForm'/);
  assert.match(result.test, /<LoginForm/);
});

test("function name auto-correction", () => {
  const result = generateTestSuite("format-date", "function");
  assert.match(result.test, /describe\('formatDate'/);
  assert.match(result.test, /formatDate\(/);
});

