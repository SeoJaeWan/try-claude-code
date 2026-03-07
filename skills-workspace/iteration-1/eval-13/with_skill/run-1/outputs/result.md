# init-coding-rules 실행 계획 (Simulation)

## Step 1 -- coding-rules 문서 읽기 완료

9개 문서 모두 확인:
- `typescript.md` - TSConfig strict 옵션, `any` 금지, interface 우선, `as` 최소화
- `naming.md` - camelCase/PascalCase, boolean prefix(is/has/should/can), handle/on prefix
- `code-style.md` - arrow function only, enum 금지(as const 사용), nested ternary 금지
- `folder-structure.md` - camelCase 폴더, 절대경로만 사용(../* 금지), import 정렬
- `comments.md` - JSDoc 필수(export 함수), why-not-what 원칙, TODO/FIXME 포맷
- `git.md` - conventional commit(영어 subject, 50자 이하, imperative mood), branch naming
- `testing.md` - Vitest + happy-dom, AAA 패턴, E2E-first
- `package-manager.md` - pnpm only, .npmrc 설정
- `completion.md` - 완료 전 test/typecheck/lint 체크리스트

## Step 2 -- 프레임워크 감지

- `package.json` 파일이 프로젝트 루트에 **존재하지 않음**
- 프로젝트는 skills/references 구조의 Claude Code 설정 저장소로 보임
- **Base TypeScript** 프레임워크로 분류 (프레임워크 시그널 없음)

## Step 3 -- 기존 설정 감사 (Audit)

| 설정 파일 | 상태 |
|-----------|------|
| `eslint.config.*` | 없음 |
| `.eslintrc.*` | 없음 |
| `tsconfig.json` | 없음 |
| `commitlint.config.*` | 없음 |
| `.husky/` | 없음 |
| `.lintstagedrc.*` | 없음 |
| `package.json` | 없음 |

모든 설정 파일이 부재하므로 전체 신규 생성 필요.

## Step 4 -- 파일별 생성 계획

### Group 1: ESLint (`eslint.config.mjs`)

**Action:** `create`

적용할 규칙 (coding-rules 매핑):

| ESLint Rule | Source | 설정값 |
|-------------|--------|--------|
| `@typescript-eslint/no-explicit-any` | typescript.md | `error` |
| `@typescript-eslint/consistent-type-definitions` | typescript.md | `["error", "interface"]` |
| `@typescript-eslint/consistent-type-assertions` | typescript.md | `["error", { assertionStyle: "as" }]` |
| `@typescript-eslint/no-unused-vars` | typescript.md | `["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]` |
| `@typescript-eslint/naming-convention` | naming.md | camelCase(변수/함수), PascalCase(타입/클래스/인터페이스), boolean prefix(is/has/should/can) |
| `no-restricted-syntax` (FunctionDeclaration) | code-style.md | arrow function only |
| `no-restricted-syntax` (TSEnumDeclaration) | code-style.md | enum 금지 |
| `no-nested-ternary` | code-style.md | `error` |
| `prefer-arrow-callback` | code-style.md | `error` |
| `simple-import-sort/imports` | folder-structure.md | `error` |
| `simple-import-sort/exports` | folder-structure.md | `error` |
| `no-restricted-imports` (../*) | folder-structure.md | `error` |
| `check-file/folder-naming-convention` | folder-structure.md | `CAMEL_CASE` |
| `jsdoc/require-jsdoc` | comments.md | export 함수/arrow function 대상 |

Framework-specific 조정: Base TypeScript이므로 조정 없음. 모든 규칙 그대로 적용.

**생성될 파일 내용 개요:**
```javascript
// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import checkFile from 'eslint-plugin-check-file';
import jsdoc from 'eslint-plugin-jsdoc';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'simple-import-sort': simpleImportSort, 'check-file': checkFile, jsdoc },
    rules: {
      // ... 위 매핑 테이블의 모든 규칙
    }
  }
);
```

**필요 devDependencies:**
- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint-plugin-simple-import-sort`
- `eslint-plugin-check-file`
- `eslint-plugin-jsdoc`

---

### Group 2: TSConfig (`tsconfig.json`)

**Action:** `create`

적용할 strict 옵션 (typescript.md 기반):

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
    "forceConsistentCasingInFileNames": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

**필요 devDependencies:**
- `typescript`

---

### Group 3: commitlint (`commitlint.config.mjs`)

**Action:** `create`

git.md 기반 규칙:
- conventional commit 포맷 강제
- 영어 subject line
- 50자 이하 subject
- imperative mood
- type prefix 필수: feat, fix, refactor, style, chore, docs, test

```javascript
// commitlint.config.mjs
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 50],
    'type-enum': [2, 'always', [
      'feat', 'fix', 'refactor', 'style', 'chore', 'docs', 'test',
      'perf', 'ci', 'build', 'revert'
    ]],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  }
};
```

**필요 devDependencies:**
- `@commitlint/cli`
- `@commitlint/config-conventional`

---

### Group 4: husky + lint-staged

**Action:** `create`

#### `.husky/pre-commit`
```bash
pnpm exec lint-staged
```

#### `.husky/commit-msg`
```bash
pnpm exec commitlint --edit $1
```

#### lint-staged 설정 (`.lintstagedrc.mjs` 또는 package.json 내)
```javascript
export default {
  '*.{ts,tsx}': ['eslint --fix'],
};
```

#### package.json scripts 추가
```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"
  }
}
```

**필요 devDependencies:**
- `husky`
- `lint-staged`

---

## Step 5 -- 그룹별 승인 (Simulation)

실제 실행 시 AskUserQuestion을 통해 각 그룹(ESLint, TSConfig, commitlint, husky+lint-staged)에 대해 개별 승인을 요청함. 이 시뮬레이션에서는 전체 승인 가정.

## Step 6 -- 전체 설치 명령어

```bash
pnpm add -D eslint @eslint/js typescript-eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-simple-import-sort eslint-plugin-check-file eslint-plugin-jsdoc typescript @commitlint/cli @commitlint/config-conventional husky lint-staged
```

> 주의: `pnpm add`는 자동 실행하지 않음. 사용자가 직접 실행해야 함.

---

## Guardrails 준수 확인

- [x] **No silent overwrites**: 모든 파일이 신규 생성이므로 충돌 없음
- [x] **No auto-install**: 설치 명령어만 출력, 자동 실행 안 함
- [x] **No invented rules**: 모든 ESLint 규칙이 coding-rules 문서에 근거
- [x] **Framework detection**: package.json 부재로 Base TypeScript 분류
- [x] **Respect existing values**: 기존 설정 파일 없으므로 해당 없음

---

## 도구 미적용 규칙 (문서로만 유지)

다음 규칙은 ESLint로 자동 적용 불가하여 개발자 재량으로 유지:
- Props destructuring inside function body (code-style.md)
- Early return pattern (code-style.md)
- handle/on prefix convention for event handlers (naming.md)
- Plural nouns for arrays (naming.md)
- Component architecture: UI + hooks separation (folder-structure.md)
- API hook naming: use{Verb}{Resource} (naming.md)
- DB naming: snake_case tables/columns (naming.md)
- AAA test pattern (testing.md)
- Why-not-what comment principle (comments.md)
- TODO/FIXME format (comments.md)
