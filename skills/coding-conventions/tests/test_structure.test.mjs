import assert from "node:assert/strict";
import test from "node:test";

import { generateStructure } from "../scripts/generators/structure.mjs";

test("nextjs page structure generation", () => {
  const result = generateStructure("problems/[id]", "page", "nextjs");
  assert.equal(result.framework, "nextjs");
  assert.equal(result.type, "page");
  assert.ok(result.folders.includes("app/(main)/problems/[id]/"));
  assert.ok(result.folders.includes("app/(main)/problems/[id]/components/"));
  assert.ok(result.folders.includes("app/(main)/problems/[id]/hooks/"));
  const files = result.files.map(([filePath]) => filePath);
  assert.ok(files.some((f) => f.includes("page.tsx")));
});

test("nextjs api structure generation", () => {
  const result = generateStructure("users", "api", "nextjs");
  assert.equal(result.framework, "nextjs");
  assert.equal(result.type, "api");
  assert.ok(result.folders.includes("app/api/users/"));
  const files = result.files.map(([filePath]) => filePath);
  assert.ok(files.some((f) => f.includes("route.ts")));
});

test("nestjs module structure generation", () => {
  const result = generateStructure("users", "module", "nestjs");
  assert.equal(result.framework, "nestjs");
  assert.equal(result.type, "module");
  assert.ok(result.folders.includes("src/users/"));
  assert.ok(result.folders.includes("src/users/dto/"));
  const files = result.files.map(([filePath]) => filePath);
  assert.ok(files.some((f) => f.includes("users.controller.ts")));
  assert.ok(files.some((f) => f.includes("users.service.ts")));
  assert.ok(files.some((f) => f.includes("users.module.ts")));
});

test("gitkeep generation", () => {
  const result = generateStructure("test", "page", "nextjs", true);
  const files = result.files.map(([filePath]) => filePath);
  assert.ok(files.some((f) => f.includes(".gitkeep")));
});

test("no gitkeep", () => {
  const result = generateStructure("test", "page", "nextjs", false);
  const files = result.files.map(([filePath]) => filePath);
  assert.equal(files.some((f) => f.includes(".gitkeep")), false);
});

test("nestjs module pascal case class name", () => {
  const result = generateStructure("user-problems", "module", "nestjs");
  const files = Object.fromEntries(result.files);
  const controllerFile = Object.keys(files).find((f) => f.includes("controller.ts"));
  assert.ok(controllerFile);
  assert.match(files[controllerFile], /UserProblemsController/);
});

test("nestjs multi-word snake case", () => {
  const result = generateStructure("user_problems", "module", "nestjs");
  const files = Object.fromEntries(result.files);
  const serviceFile = Object.keys(files).find((f) => f.includes("service.ts"));
  assert.ok(serviceFile);
  assert.match(files[serviceFile], /UserProblemsService/);
});

