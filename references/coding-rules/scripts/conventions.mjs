#!/usr/bin/env node
/**
 * Coding Conventions Data
 * Defines all coding rules from .claude/try-claude/references/coding-rules/*.md
 */

import fs from "fs";
import path from "path";

export function resolveHooksRoot(projectRoot = process.cwd()) {
  const candidates = ["src/hooks", "app/hooks", "hooks"];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(projectRoot, candidate))) {
      return candidate;
    }
  }
  return "hooks";
}

export const COMPONENT_CONVENTIONS = {
  function_style: "arrow",
  export_style: "default",
  props_destructure: "inside",
  jsdoc_required: true,
  props_interface_pattern: "{Component}Props",
  naming: "PascalCase",
  folder_structure: "{componentName}/index.tsx",
};

export const HOOK_CONVENTIONS = {
  prefix: "use",
  naming: "camelCase",
  function_style: "arrow",
  export_style: "default",
  test_pattern: "AAA",
  test_language: "korean",
  jsdoc_required: true,
  folder_structure: "{hookName}/index.ts",
};

export const FOLDER_STRUCTURE_CONVENTIONS = {
  naming: "camelCase",
  nextjs: {
    page: "app/(group)/{path}/page.tsx",
    components: "app/(group)/{path}/components/",
    hooks: "app/(group)/{path}/hooks/",
  },
  nestjs: {
    module: "src/{path}/{path}.module.ts",
    controller: "src/{path}/{path}.controller.ts",
    service: "src/{path}/{path}.service.ts",
    dto: "src/{path}/dto/",
  },
};

export const API_HOOK_CONVENTIONS = {
  query: {
    path: "{hooksRoot}/apis/queries/",
    pattern: "useQuery",
    naming: "use + Get + Resource",
  },
  mutation: {
    path: "{hooksRoot}/apis/mutations/",
    pattern: "useMutation",
    naming: "use + Verb + Resource",
  },
};

export const TEST_SUITE_CONVENTIONS = {
  pattern: "AAA",
  language: "korean",
  structure: "describe/it",
  hook_test: "renderHook + act",
  component_test: "render",
  function_test: "direct call",
};

export const CODE_STYLE = {
  function: "arrow",
  import_order: ["external", "internal", "relative"],
  export: "default",
  props_destructure: "inside",
  early_return: true,
};

export const TYPESCRIPT_RULES = {
  object_type: "interface",
  union_type: "type",
  any_forbidden: true,
  as_minimize: true,
  props_pattern: "{Component}Props",
};

export const NAMING_RULES = {
  folder: "camelCase",
  component: "PascalCase",
  hook: "camelCase + use prefix",
  function: "camelCase",
  variable: "camelCase",
  constant: "UPPER_SNAKE_CASE",
  interface: "PascalCase",
  type: "PascalCase",
  boolean: "is/has/should/can prefix",
  array: "plural",
  handler: "handle prefix",
};

export const DATABASE_RULES = {
  table: "snake_case + plural",
  column: "snake_case",
  index: "idx_{table}_{columns}",
  foreign_key: "{table}_id",
  frontend_conversion: "humps library (camelizeKeys)",
};

