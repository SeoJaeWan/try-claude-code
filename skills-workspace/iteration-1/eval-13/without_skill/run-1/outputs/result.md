# init-coding-rules: ESLint + commitlint + husky Configuration Generation

## Task

Generate ESLint, commitlint, and husky configurations based on the project's `references/coding-rules/` documents.

## Framework Detection

No `package.json` found in the project root. This is a skills/references repository, so **Base TypeScript** configuration was used.

## Generated Files

### 1. ESLint (`eslint.config.mjs`)

Flat config format using `typescript-eslint`. Rules mapped from coding-rules:

| Coding Rule | Source | ESLint Rule |
|---|---|---|
| No `any` | typescript.md | `@typescript-eslint/no-explicit-any: error` |
| Interface over type alias | typescript.md | `@typescript-eslint/consistent-type-definitions: ["error", "interface"]` |
| `as` assertion style | typescript.md | `@typescript-eslint/consistent-type-assertions` |
| No unused vars (_prefix OK) | typescript.md | `@typescript-eslint/no-unused-vars` with ignore patterns |
| camelCase / PascalCase naming | naming.md | `@typescript-eslint/naming-convention` |
| Boolean prefix (is/has/should/can) | naming.md | `@typescript-eslint/naming-convention` with prefix |
| Arrow function only | code-style.md | `no-restricted-syntax` (FunctionDeclaration) |
| No enum (use as const) | code-style.md | `no-restricted-syntax` (TSEnumDeclaration) |
| No nested ternary | code-style.md | `no-nested-ternary: error` |
| Arrow callbacks | code-style.md | `prefer-arrow-callback: error` |
| Import/Export sorting | folder-structure.md | `simple-import-sort/imports` + `exports` |
| Absolute path only | folder-structure.md | `no-restricted-imports` patterns `["../*"]` |
| Folder camelCase | folder-structure.md | `check-file/folder-naming-convention` |
| JSDoc for exports | comments.md | `jsdoc/require-jsdoc` |

### 2. commitlint (`commitlint.config.mjs`)

Based on `git.md` commit conventions:

- Subject line max 50 characters
- Allowed types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`, `ci`, `perf`, `build`, `revert`
- Type and subject are required
- Subject must be lowercase, no trailing period
- Body and footer must have leading blank lines

### 3. husky (`.husky/`)

- **pre-commit**: Runs `lint-staged` to lint staged files
- **commit-msg**: Runs `commitlint` to validate commit messages

### 4. lint-staged (`.lintstagedrc.mjs`)

- `*.{ts,tsx,js,jsx,mjs}` files: `eslint --fix`
- `*.{json,md,css,scss}` files: `prettier --write`

## Required devDependencies

```bash
pnpm add -D eslint typescript-eslint eslint-plugin-simple-import-sort eslint-plugin-check-file eslint-plugin-jsdoc @commitlint/cli @commitlint/config-conventional husky lint-staged prettier
```

## Setup Commands

```bash
# Install dependencies
pnpm add -D eslint typescript-eslint eslint-plugin-simple-import-sort eslint-plugin-check-file eslint-plugin-jsdoc @commitlint/cli @commitlint/config-conventional husky lint-staged prettier

# Initialize husky
pnpm exec husky init

# Copy hook files to .husky/ directory
# (pre-commit and commit-msg are already generated)
```

## Notes

- No rules were invented beyond what is documented in coding-rules.
- Framework-specific adjustments (Next.js, NestJS, React Native, Vite React) were not applied since no `package.json` was detected. When integrating into an actual project, framework detection should be performed and adjustments applied accordingly.
- Rules that cannot be enforced by tooling (props destructuring, early return pattern, handle/on prefix, etc.) remain as documentation only.
