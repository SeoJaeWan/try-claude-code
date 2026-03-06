import assert from "node:assert/strict";
import test from "node:test";

import { generateApiHook } from "../scripts/generators/api_hook.mjs";

test("query hook generation", () => {
  const result = generateApiHook("useGetUser", "query", "/api/users");
  assert.equal(result.subfolder, "queries");
  assert.match(result.hook, /useQuery/);
  assert.match(result.hook, /queryKey/);
  assert.match(result.hook, /queryFn/);
  assert.match(result.hook, /\/api\/users/);
});

test("mutation hook generation", () => {
  const result = generateApiHook("useLogin", "mutation", "/api/auth/login");
  assert.equal(result.subfolder, "mutations");
  assert.match(result.hook, /useMutation/);
  assert.match(result.hook, /mutationFn/);
  assert.match(result.hook, /\/api\/auth\/login/);
  assert.match(result.hook, /method: 'POST'/);
});

test("query hook test generation", () => {
  const result = generateApiHook("useGetUser", "query", null, true, true);
  assert.match(result.test, /renderHook/);
  assert.match(result.test, /waitFor/);
  assert.match(result.test, /QueryClientProvider/);
});

test("mutation hook test generation", () => {
  const result = generateApiHook("useLogin", "mutation", null, true, true);
  assert.match(result.test, /renderHook/);
  assert.match(result.test, /act/);
  assert.match(result.test, /result\.current\.mutate/);
});

test("hook with jsdoc", () => {
  const result = generateApiHook("useGetUser", "query", null, true);
  assert.match(result.hook, /\/\*\*/);
  assert.match(result.hook, /API 훅/);
});

test("hook folder structure", () => {
  const result = generateApiHook("useGetUser", "query");
  assert.equal(result.folder, "useGetUser/");
  assert.equal(result.hook_file, "index.ts");
  assert.equal(result.test_file, "__tests__/index.test.tsx");
});

test("name auto-correction missing use prefix", () => {
  const result = generateApiHook("GetUser", "query");
  assert.match(result.hook, /const useGetUser = \(/);
  assert.equal(result.folder, "useGetUser/");
});

test("name auto-correction from kebab", () => {
  const result = generateApiHook("get-user", "query");
  assert.match(result.hook, /const useGetUser = \(/);
});

test("name auto-correction from snake", () => {
  const result = generateApiHook("create_post", "mutation");
  assert.match(result.hook, /const useCreatePost = \(\)/);
});

