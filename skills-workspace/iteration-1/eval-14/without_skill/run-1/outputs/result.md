# Linting and Commit Hooks Setup Based on Coding Conventions

## Overview

This document describes the complete linting and commit hook configuration derived from the project's coding conventions found in `references/coding-rules/`. The project uses **pnpm** as its package manager (npm/yarn are prohibited per `package-manager.md`).

---

## 1. ESLint Configuration (Flat Config)

Based on the coding-rules-to-ESLint mapping table in `skills/init-coding-rules/SKILL.md`, the following `eslint.config.mjs` should be generated:

### File: `eslint.config.mjs`

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import checkFile from "eslint-plugin-check-file";
import jsdoc from "eslint-plugin-jsdoc";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "check-file": checkFile,
      jsdoc: jsdoc,
    },
    rules: {
      // typescript.md: No `any`
      "@typescript-eslint/no-explicit-any": "error",

      // typescript.md: Interface over type alias for object types
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      // typescript.md: Minimize `as` assertions, use "as" style when needed
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as" },
      ],

      // typescript.md: No unused vars (_prefix OK)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // naming.md: camelCase for variables/functions, PascalCase for types/classes/interfaces
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

      // code-style.md: Arrow function only (no function declarations)
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

      // code-style.md: No nested ternary
      "no-nested-ternary": "error",

      // code-style.md: Arrow callbacks
      "prefer-arrow-callback": "error",

      // folder-structure.md: Import/Export sorting
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // folder-structure.md: Absolute path only (no ../* imports)
      "no-restricted-imports": [
        "error",
        { patterns: ["../*"] },
      ],

      // folder-structure.md: Folder camelCase naming
      "check-file/folder-naming-convention": [
        "error",
        { "**/*": "CAMEL_CASE" },
      ],

      // comments.md: JSDoc for exported functions
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
```

### Framework-specific Adjustments

The ESLint config must be adapted based on framework detection from `package.json`:

| Framework | Adjustments |
|-----------|------------|
| **Next.js** | Add `FlatCompat` with `next/core-web-vitals`, `next/typescript`; add `eslint-plugin-react`, `eslint-plugin-react-hooks`; respect reserved filenames in `check-file` |
| **NestJS** | Relax `FunctionDeclaration` restriction; exclude boolean prefix convention; add `@typescript-eslint/explicit-function-return-type` |
| **React Native** | Disable `no-restricted-imports` for `../*`; disable `check-file/folder-naming-convention`; add React plugins |
| **Vite React** | Add `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| **Base TypeScript** | Core rules only, no framework plugins |

---

## 2. commitlint Configuration

Based on `git.md` commit message conventions:

### File: `commitlint.config.mjs`

```javascript
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // git.md: Subject line 50 characters or fewer
    "header-max-length": [2, "always", 50],

    // git.md: Use imperative mood (enforced by type-enum)
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "style", "docs", "chore", "test"],
    ],

    // git.md: Type prefix is required
    "type-empty": [2, "never"],

    // git.md: Subject is required
    "subject-empty": [2, "never"],

    // git.md: Blank line between subject and body
    "body-leading-blank": [2, "always"],

    // git.md: Footer blank line
    "footer-leading-blank": [2, "always"],
  },
};
```

---

## 3. husky + lint-staged (Git Hooks)

### Setup Steps

```bash
# Initialize husky
pnpm add -D husky
pnpm exec husky init
```

### File: `.husky/pre-commit`

```bash
pnpm exec lint-staged
```

### File: `.husky/commit-msg`

```bash
pnpm exec commitlint --edit $1
```

### lint-staged Configuration

Add to `package.json` or create `.lintstagedrc.json`:

```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{js,mjs,cjs}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css}": [
    "prettier --write"
  ]
}
```

This ensures:
- **pre-commit hook**: Runs ESLint + Prettier on staged files only (via lint-staged), enforcing all code-style, naming, TypeScript, import sorting, and JSDoc rules
- **commit-msg hook**: Validates commit messages against commitlint rules (conventional commits, 50-char limit, required type prefix)

---

## 4. TSConfig Strict Settings

Based on `typescript.md`, the following strict options should be present or merged into `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Conflict resolution policy: existing values are never auto-overwritten. On conflict, the user chooses `keep` or `apply` after reviewing impact.

---

## 5. package.json Scripts and Guards

Based on `package-manager.md`:

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"
  }
}
```

### .npmrc Settings

```ini
shamefully-hoist=false
strict-peer-dependencies=true
auto-install-peers=false
prefer-frozen-lockfile=true
```

---

## 6. Required devDependencies

```bash
pnpm add -D \
  eslint \
  typescript-eslint \
  @eslint/js \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-simple-import-sort \
  eslint-plugin-check-file \
  eslint-plugin-jsdoc \
  prettier \
  husky \
  lint-staged \
  @commitlint/cli \
  @commitlint/config-conventional
```

---

## 7. Rules NOT Enforceable by Tooling

These rules from the coding conventions remain as documentation-only guidance and cannot be automated via linting or hooks:

- Props destructuring inside function body (code-style.md)
- Early return pattern (code-style.md)
- `handle`/`on` prefix convention for event handlers (naming.md)
- Plural nouns for arrays (naming.md)
- Component architecture: UI + hooks separation (folder-structure.md)
- API hook naming: `use{Verb}{Resource}` (naming.md)
- DB naming: snake_case tables/columns (naming.md)
- AAA test pattern (testing.md)
- Why-not-what comment principle (comments.md)
- TODO/FIXME format: `// TODO(owner): description (#issue)` (comments.md)

---

## 8. Workflow Integration

The commit skill (`skills/commit/SKILL.md`) integrates with this setup:
1. Pre-commit hook runs lint-staged (ESLint + Prettier on staged files)
2. Commit-msg hook validates the message via commitlint
3. If commitlint is not installed, the commit skill skips validation gracefully
4. The completion checklist (`references/coding-rules/completion.md`) requires passing: `pnpm test`, `pnpm run typecheck`, and `pnpm lint --fix` before claiming task completion
