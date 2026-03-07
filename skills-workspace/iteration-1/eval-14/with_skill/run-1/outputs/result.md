# init-coding-rules Skill Simulation Result

## Task

Set up linting and commit hooks based on the project's coding conventions.

## Skill Overview

The `init-coding-rules` skill reads coding-rules documents and dynamically generates ESLint, commitlint, husky, lint-staged, and TSConfig configurations. It follows a 6-step workflow: Read rules, Detect framework, Audit existing configs, Generate plan, Approve per group, Apply + show deps.

---

## Simulated Workflow Execution

### Step 1 -- Read coding-rules

All 9 coding-rules documents were read from `.claude/try-claude/references/coding-rules/`:

| Document | Key Rules Extracted |
|----------|-------------------|
| typescript.md | No `any`, interface over type alias, `as` assertion style, no unused vars (underscore-prefix OK), strict TSConfig options |
| naming.md | camelCase/PascalCase conventions, boolean prefix (is/has/should/can), handle/on event handler prefixes, plural nouns for arrays |
| code-style.md | Arrow functions only, no enum (use `as const`), no nested ternary, props destructuring inside body, early return |
| folder-structure.md | Import/export sorting, absolute path only (no `../`), folder camelCase naming |
| comments.md | JSDoc required for exported functions, why-not-what principle, TODO/FIXME format |
| git.md | Conventional commit format (type: subject), imperative mood, 50-char limit, branch naming `{type}/{feature-summary}` |
| testing.md | Vitest + happy-dom, AAA pattern, E2E-first strategy, test file co-location |
| package-manager.md | pnpm only, preinstall guard, .npmrc strict settings |
| completion.md | Standard checklist: tests, typecheck, lint before completion |

### Step 2 -- Detect framework

No `package.json` was found in the repository root. The project appears to be a meta-project (skill/convention repository) rather than a deployable application.

**Simulated decision**: In a real execution, the skill would use `AskUserQuestion` to clarify the target framework. For this simulation, we assume **Base TypeScript** as the framework target.

### Step 3 -- Audit existing configs

| Config File | Status |
|-------------|--------|
| `eslint.config.*` / `.eslintrc.*` | Not found |
| `tsconfig.json` / `tsconfig.*.json` | Not found |
| `commitlint.config.*` | Not found |
| `.husky/` directory | Not found |
| `.lintstagedrc.*` / lint-staged in package.json | Not found |
| `package.json` | Not found |

**Result**: No existing configurations detected. All files would be created fresh.

### Step 4 -- Generate plan

The skill would present the following file-by-file generation plan:

#### Group 1: ESLint (`eslint.config.mjs` + plugins)

| ESLint Rule | Source | Configuration |
|-------------|--------|---------------|
| `@typescript-eslint/no-explicit-any: error` | typescript.md | Ban `any` type |
| `@typescript-eslint/consistent-type-definitions: ["error", "interface"]` | typescript.md | Interface over type alias |
| `@typescript-eslint/consistent-type-assertions: ["error", { assertionStyle: "as" }]` | typescript.md | Enforce `as` assertion style |
| `@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]` | typescript.md | Allow underscore-prefixed unused vars |
| `@typescript-eslint/naming-convention` | naming.md | camelCase for vars/functions, PascalCase for types/classes/interfaces, boolean prefix |
| `no-restricted-syntax` (FunctionDeclaration) | code-style.md | Arrow functions only |
| `no-restricted-syntax` (TSEnumDeclaration) | code-style.md | No enum, use `as const` |
| `no-nested-ternary: error` | code-style.md | No nested ternary |
| `prefer-arrow-callback: error` | code-style.md | Arrow callbacks |
| `simple-import-sort/imports: error` | folder-structure.md | Import sorting |
| `simple-import-sort/exports: error` | folder-structure.md | Export sorting |
| `no-restricted-imports: ["error", { patterns: ["../*"] }]` | folder-structure.md | No relative parent imports |
| `check-file/folder-naming-convention: ["error", { "**/*": "CAMEL_CASE" }]` | folder-structure.md | Folder camelCase |
| `jsdoc/require-jsdoc` (exported functions) | comments.md | JSDoc for public APIs |

**Action**: Create `eslint.config.mjs`

**Required plugins**:
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint-plugin-simple-import-sort`
- `eslint-plugin-check-file`
- `eslint-plugin-jsdoc`

#### Group 2: TSConfig (`tsconfig.json`)

Strict options to be set (from typescript.md):

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

**Action**: Create `tsconfig.json`

#### Group 3: commitlint (`commitlint.config.mjs`)

Based on git.md conventions:

- Conventional commit types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`
- Subject max length: 50 characters
- Imperative mood (no past tense)
- English-only subject line
- Body separated by blank line

**Action**: Create `commitlint.config.mjs`

**Required packages**: `@commitlint/cli`, `@commitlint/config-conventional`

#### Group 4: husky + lint-staged

- `.husky/pre-commit`: Run lint-staged on staged files
- `.husky/commit-msg`: Run commitlint on commit messages
- lint-staged config: Run ESLint `--fix` on `*.{ts,tsx}` files

**Action**: Create `.husky/pre-commit`, `.husky/commit-msg`, `.lintstagedrc.json`

**Required packages**: `husky`, `lint-staged`

### Step 5 -- Approve per group (simulated)

In a real execution, the skill would use `AskUserQuestion` to get approval for each of the 4 groups independently. For this simulation, all groups are assumed approved.

### Step 6 -- Apply + show deps

The skill would write the configuration files and output the following install command:

```bash
pnpm add -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-simple-import-sort eslint-plugin-check-file eslint-plugin-jsdoc @commitlint/cli @commitlint/config-conventional husky lint-staged typescript
```

The skill explicitly does NOT run `pnpm add` automatically -- it only displays the command for the user to execute manually.

---

## Files That Would Be Created

| File | Purpose |
|------|---------|
| `eslint.config.mjs` | Flat ESLint config with all coding-rules mapped to ESLint rules |
| `tsconfig.json` | Strict TypeScript configuration |
| `commitlint.config.mjs` | Conventional commit message validation |
| `.husky/pre-commit` | Git hook to run lint-staged before commits |
| `.husky/commit-msg` | Git hook to run commitlint on commit messages |
| `.lintstagedrc.json` | lint-staged config to run ESLint on staged `.ts`/`.tsx` files |

## Rules Not Enforceable by Tooling (documentation only)

The following rules from coding-rules remain as team conventions and cannot be enforced via ESLint or hooks:

- Props destructuring inside function body (code-style.md)
- Early return pattern (code-style.md)
- `handle`/`on` prefix convention for event handlers (naming.md)
- Plural nouns for arrays (naming.md)
- Component architecture: UI + hooks separation (folder-structure.md)
- API hook naming: `use{Verb}{Resource}` (naming.md)
- DB naming: snake_case tables/columns (naming.md)
- AAA test pattern (testing.md)
- Why-not-what comment principle (comments.md)
- TODO/FIXME format (comments.md)

## Guardrails Observed

- No silent overwrites: all configs are new (no existing files to conflict with)
- No auto-install: install command shown but not executed
- No invented rules: every ESLint rule traces back to a coding-rules document
- Framework detection: would ask user if ambiguous (Base TypeScript assumed for simulation)

---

## Skill Evaluation

| Aspect | Assessment |
|--------|------------|
| Clarity of instructions | High -- 6-step workflow is well-structured and unambiguous |
| Coverage | Comprehensive -- maps all enforceable coding-rules to ESLint rules with a clear mapping table |
| Safety | Strong -- guardrails prevent silent overwrites and auto-installs |
| Framework awareness | Good -- adjustments documented for Next.js, NestJS, React Native, Vite React, and Base TypeScript |
| User control | Excellent -- per-group approval and manual install ensure user remains in control |
| Traceability | Every ESLint rule links back to its source coding-rules document |
