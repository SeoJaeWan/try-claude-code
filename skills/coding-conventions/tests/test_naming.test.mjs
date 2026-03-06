import assert from "node:assert/strict";
import test from "node:test";

import { ensureUsePrefix, splitWords, toCamelCase, toPascalCase, toSnakeCase } from "../scripts/naming.mjs";

test("split words - kebab", () => {
  assert.deepEqual(splitWords("login-form"), ["login", "form"]);
});

test("split words - snake", () => {
  assert.deepEqual(splitWords("login_form"), ["login", "form"]);
});

test("split words - camel", () => {
  assert.deepEqual(splitWords("loginForm"), ["login", "Form"]);
});

test("split words - pascal", () => {
  assert.deepEqual(splitWords("LoginForm"), ["Login", "Form"]);
});

test("split words - single", () => {
  assert.deepEqual(splitWords("button"), ["button"]);
});

test("split words - empty", () => {
  assert.deepEqual(splitWords(""), []);
});

test("split words - use prefix", () => {
  assert.deepEqual(splitWords("useLoginForm"), ["use", "Login", "Form"]);
});

test("split words - multiple delimiters", () => {
  assert.deepEqual(splitWords("user-login_form"), ["user", "login", "form"]);
});

test("to pascal case", () => {
  assert.equal(toPascalCase("login-form"), "LoginForm");
  assert.equal(toPascalCase("login_form"), "LoginForm");
  assert.equal(toPascalCase("loginForm"), "LoginForm");
  assert.equal(toPascalCase("LoginForm"), "LoginForm");
  assert.equal(toPascalCase("button"), "Button");
  assert.equal(toPascalCase("user_problems"), "UserProblems");
  assert.equal(toPascalCase(""), "");
});

test("to camel case", () => {
  assert.equal(toCamelCase("LoginForm"), "loginForm");
  assert.equal(toCamelCase("login-form"), "loginForm");
  assert.equal(toCamelCase("login_form"), "loginForm");
  assert.equal(toCamelCase("loginForm"), "loginForm");
  assert.equal(toCamelCase("Button"), "button");
  assert.equal(toCamelCase(""), "");
});

test("to snake case", () => {
  assert.equal(toSnakeCase("LoginForm"), "login_form");
  assert.equal(toSnakeCase("loginForm"), "login_form");
  assert.equal(toSnakeCase("login-form"), "login_form");
  assert.equal(toSnakeCase("login_form"), "login_form");
});

test("ensure use prefix", () => {
  assert.equal(ensureUsePrefix("loginForm"), "useLoginForm");
  assert.equal(ensureUsePrefix("useLoginForm"), "useLoginForm");
  assert.equal(ensureUsePrefix("LoginForm"), "useLoginForm");
  assert.equal(ensureUsePrefix("login-form"), "useLoginForm");
  assert.equal(ensureUsePrefix("counter"), "useCounter");
  assert.equal(ensureUsePrefix("useCounter"), "useCounter");
  assert.equal(ensureUsePrefix("login_form"), "useLoginForm");
});

