import assert from "node:assert/strict";
import test from "node:test";

import { generateComponent } from "../scripts/generators/component.mjs";

test("basic component generation", () => {
  const result = generateComponent("Button");
  assert.ok("component" in result);
  assert.ok("test" in result);
  assert.match(result.component, /const Button = \(props: ButtonProps\)/);
  assert.match(result.component, /export default Button/);
  assert.match(result.component, /interface ButtonProps/);
});

test("component with props", () => {
  const result = generateComponent("LoginForm", "ui", "email:string,password:string,onSubmit:() => void");
  assert.match(result.component, /email: string;/);
  assert.match(result.component, /password: string;/);
  assert.match(result.component, /onSubmit: \(\) => void;/);
  assert.match(result.component, /const \{ email, password, onSubmit \} = props;/);
});

test("component with jsdoc", () => {
  const result = generateComponent("Card", "ui", "title:string", true);
  assert.match(result.component, /\/\*\*/);
  assert.match(result.component, /\* Card 컴포넌트/);
  assert.match(result.component, /@param/);
});

test("component without jsdoc", () => {
  const result = generateComponent("Card", "ui", null, false);
  assert.equal(result.component.includes("/**"), false);
});

test("component test generation", () => {
  const result = generateComponent("Button", "ui", null, true, true);
  assert.match(result.test, /describe\('Button'/);
  assert.match(result.test, /it\('/);
  assert.match(result.test, /\/\/ Arrange/);
  assert.match(result.test, /\/\/ Act/);
  assert.match(result.test, /\/\/ Assert/);
});

test("component folder structure", () => {
  const result = generateComponent("LoginForm");
  assert.equal(result.folder, "loginForm/");
  assert.equal(result.component_file, "index.tsx");
  assert.equal(result.test_file, "__tests__/index.test.tsx");
});

test("name auto-correction from kebab", () => {
  const result = generateComponent("login-form");
  assert.match(result.component, /const LoginForm = \(props: LoginFormProps\)/);
  assert.match(result.component, /export default LoginForm/);
  assert.equal(result.folder, "loginForm/");
});

test("name auto-correction from snake", () => {
  const result = generateComponent("login_form");
  assert.match(result.component, /const LoginForm = \(props: LoginFormProps\)/);
  assert.equal(result.folder, "loginForm/");
});

test("name auto-correction from camel", () => {
  const result = generateComponent("loginForm");
  assert.match(result.component, /const LoginForm = \(props: LoginFormProps\)/);
  assert.equal(result.folder, "loginForm/");
});

