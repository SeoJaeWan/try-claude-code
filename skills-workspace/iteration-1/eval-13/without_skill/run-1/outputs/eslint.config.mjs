import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import checkFile from "eslint-plugin-check-file";
import jsdoc from "eslint-plugin-jsdoc";

export default tseslint.config(
  // Base recommended configs
  ...tseslint.configs.recommended,

  // Global ignores
  {
    ignores: ["node_modules/", "dist/", "build/", ".next/", "coverage/"],
  },

  // Main rules derived from coding-rules
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "check-file": checkFile,
      jsdoc: jsdoc,
    },
    rules: {
      // --- typescript.md ---
      // No `any`
      "@typescript-eslint/no-explicit-any": "error",

      // Interface over type alias
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      // `as` assertion style
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as" },
      ],

      // No unused vars (_prefix OK)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // --- naming.md ---
      // camelCase for variables/functions, PascalCase for types/classes/interfaces
      // Boolean prefix (is/has/should/can)
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "variable",
          types: ["boolean"],
          format: ["camelCase"],
          prefix: ["is", "has", "should", "can"],
        },
      ],

      // --- code-style.md ---
      // Arrow function only (no function declarations)
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration",
          message: "Use arrow function expressions instead.",
        },
        {
          selector: "TSEnumDeclaration",
          message: "Use as const object instead of enum.",
        },
      ],

      // No nested ternary
      "no-nested-ternary": "error",

      // Arrow callbacks
      "prefer-arrow-callback": "error",

      // --- folder-structure.md ---
      // Import/Export sorting
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Absolute path only (no ../* relative imports)
      "no-restricted-imports": [
        "error",
        {
          patterns: ["../*"],
        },
      ],

      // Folder camelCase
      "check-file/folder-naming-convention": [
        "error",
        { "**/*": "CAMEL_CASE" },
      ],

      // --- comments.md ---
      // JSDoc for exports
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
          },
          checkConstructors: false,
          contexts: [
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression",
          ],
        },
      ],
    },
  }
);
