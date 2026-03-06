---
name: init-coding-rules
description: coding-rules 기반 ESLint + commitlint + husky + lint-staged + TSConfig 설정 동적 생성
model: sonnet
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Bash(pnpm *), Bash(git *)
---

<Skill_Guide>
<Purpose>
Read coding-rules documents and dynamically generate ESLint, commitlint, husky, lint-staged, and TSConfig configurations.
Replaces the former config-governor conversational workflow with a one-shot generation approach.
</Purpose>

<Instructions>
# init-coding-rules

Use this skill when the user asks to generate or initialize lint/type/commit/hook configurations based on project coding-rules.

## Workflow

### Step 1 — Read coding-rules

Read all documents under `.claude/try-claude/references/coding-rules/` (9 files):
- typescript.md, naming.md, code-style.md, folder-structure.md, comments.md
- git.md, testing.md, package-manager.md, completion.md

These are the **single source of truth**. Do not invent rules beyond what is documented.

### Step 2 — Detect framework

Inspect `package.json` dependencies and devDependencies:

| Signal | Framework |
|--------|-----------|
| `next` | Next.js |
| `@nestjs/core` | NestJS |
| `react-native` | React Native |
| `vite` + `react` | Vite React |
| none of the above | Base TypeScript |

If ambiguous (e.g. multiple signals), ask the user via AskUserQuestion.

### Step 3 — Audit existing configs

Check for existing configuration files:
- `eslint.config.*` (flat config)
- `.eslintrc.*` (legacy — suggest migration)
- `tsconfig.json`, `tsconfig.*.json`
- `commitlint.config.*`
- `.husky/` directory
- `.lintstagedrc.*` or `lint-staged` in `package.json`
- `package.json` scripts

Note which files exist and their current state. Do not overwrite values silently.

### Step 4 — Generate plan

Present a file-by-file generation/modification plan using the **Coding-rules to ESLint mapping table** below.

For each file group, show:
- File path
- Action: `create` or `modify`
- Key rules/settings to be applied
- Reason (linked to coding-rules source)

### Step 5 — Approve per group

Use AskUserQuestion to request approval for each file group independently:

1. **ESLint** — `eslint.config.mjs` + plugins
2. **TSConfig** — `tsconfig.json` strict options
3. **commitlint** — `commitlint.config.mjs`
4. **husky + lint-staged** — `.husky/pre-commit`, lint-staged config

Each group can be approved or skipped independently. Only apply approved groups.

### Step 6 — Apply + show deps

- Write/edit only approved configuration files.
- At the end, output the full list of required `devDependencies` the user needs to install.
- **Do NOT run `pnpm add` automatically.** Show the install command for the user to run manually.

Example output:
```
Required devDependencies:
pnpm add -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-simple-import-sort eslint-plugin-check-file eslint-plugin-jsdoc ...
```

---

## Coding-rules to ESLint Mapping Table

| Coding Rule | Source | ESLint Rule |
|---|---|---|
| No `any` | typescript.md | `@typescript-eslint/no-explicit-any: error` |
| Interface over type alias | typescript.md | `@typescript-eslint/consistent-type-definitions: ["error", "interface"]` |
| `as` assertion style | typescript.md | `@typescript-eslint/consistent-type-assertions: ["error", { assertionStyle: "as" }]` |
| No unused vars (_prefix OK) | typescript.md | `@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]` |
| camelCase / PascalCase | naming.md | `@typescript-eslint/naming-convention` (camelCase for variables/functions, PascalCase for types/classes/interfaces) |
| Boolean prefix (is/has/should/can) | naming.md | `@typescript-eslint/naming-convention` (boolean variables must match `^(is\|has\|should\|can)`) |
| Arrow function only | code-style.md | `no-restricted-syntax: ["error", { selector: "FunctionDeclaration", message: "Use arrow function expressions instead." }]` |
| No enum (use as const) | code-style.md | `no-restricted-syntax: ["error", { selector: "TSEnumDeclaration", message: "Use as const object instead of enum." }]` |
| No nested ternary | code-style.md | `no-nested-ternary: error` |
| Arrow callbacks | code-style.md | `prefer-arrow-callback: error` |
| Import/Export sorting | folder-structure.md | `simple-import-sort/imports: error`, `simple-import-sort/exports: error` |
| Absolute path only (no ../*) | folder-structure.md | `no-restricted-imports: ["error", { patterns: ["../*"] }]` |
| Folder camelCase | folder-structure.md | `check-file/folder-naming-convention: ["error", { "**/*": "CAMEL_CASE" }]` |
| JSDoc for exports | comments.md | `jsdoc/require-jsdoc: ["error", { require: { FunctionDeclaration: true, ArrowFunctionExpression: true }, checkConstructors: false, contexts: ["ExportNamedDeclaration > FunctionDeclaration", "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression"] }]` |

### Rules NOT enforceable by tooling (remain as documentation)

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

## Framework-specific Adjustments

### Next.js
- Use `FlatCompat` with `next/core-web-vitals` and `next/typescript`
- Include `eslint-plugin-react`, `eslint-plugin-react-hooks`
- Boolean prefix naming convention: **enabled**
- `check-file/folder-naming-convention`: respect Next.js reserved names (page.tsx, layout.tsx, route.ts, dynamic segments)

### NestJS
- **Relax** `FunctionDeclaration` restriction (class methods are standard)
- **Exclude** boolean prefix naming convention (decorators and DI patterns)
- Include `@typescript-eslint/explicit-function-return-type` for controller/service methods

### React Native
- **Disable** `no-restricted-imports` for `../*` (monorepo path conventions differ)
- **Disable** `check-file/folder-naming-convention` (platform-specific naming like `.ios.tsx`, `.android.tsx`)
- Include `eslint-plugin-react`, `eslint-plugin-react-hooks`

### Vite React
- Include `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Boolean prefix naming convention: **enabled**
- Standard flat config (no FlatCompat needed)

### Base TypeScript
- Core rules only, no framework-specific plugins
- All naming conventions and restrictions apply as-is

---

## Guardrails

- **No silent overwrites**: if a config file exists, show the diff and ask before modifying.
- **No auto-install**: never run `pnpm add` automatically. Always output the command for the user.
- **No invented rules**: every ESLint rule must trace back to a coding-rules document.
- **Framework ambiguity**: if detection is unclear, ask the user via AskUserQuestion.
- **Respect existing values**: merge with existing config where possible rather than replacing entirely.

</Instructions>
</Skill_Guide>
