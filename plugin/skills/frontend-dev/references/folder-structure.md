# Frontend Folder Structure Rules

---

## Component Architecture

### Core Principle: Component = UI + Composition of Custom Hooks

- Components do not implement new logic directly
- All logic is extracted into custom hooks
- Components import hooks and combine them in handlers only
- **기존 컴포넌트에 인라인 로직(fetch, useState 등)이 있는 경우, 새 기능을 추가하기 전에 먼저 해당 로직을 커스텀 훅으로 추출한다** — 인라인 로직 위에 기능을 쌓으면 컴포넌트가 비대해지고 테스트가 어려워진다

```tsx
// Good: 훅들을 결합하는 컴포넌트
const LoginPage = () => {
  const { form, handleChange } = useLoginForm();
  const { login, isLoading } = useLogin();
  const handleSubmit = () => login(form);
  return <LoginFormUI {...form} onSubmit={handleSubmit} />;
};

// Bad: 컴포넌트에 직접 로직 구현 (useState, fetch 등)
```

---

## UI Components vs Page Components

| | UI Component | Page Component |
| ---- | --------------------------- | ------------------------ |
| Location | `app/{feature}/components/` | `app/{feature}/page.tsx` |
| Role | Layout only | Composes hooks |
| Logic | None (receives props only) | Combines hooks in handlers |
| Owner | Publisher | Frontend Developer |

---

## Components Folder Structure

```
components/
├── common/              # 공통 (2+ 페이지에서 사용)
│   ├── header/index.tsx
│   └── button/index.tsx
├── {domain}/            # 도메인별
│   └── problemCard/index.tsx
└── providers/index.tsx  # Context Providers
```

### Component Placement Criteria

| Condition | Location |
| ------------------------ | -------------------------- |
| Used in 2 or more pages | `components/common/` |
| Used in a specific domain only | `components/{domain}/` |
| Exclusive to a page | `app/{domain}/components/` |

---

## Sub-component Extraction Rules

Sub-components nested inside a parent component folder
must be **moved to the shared location immediately the moment they are used anywhere else**.

| Target | Initial Location | Location After Reuse |
| ---- | --------- | ------------------- |
| Sub-component exclusive to parent | `components/{domain}/{parent}/{child}/index.tsx` | `components/common/{child}/index.tsx` |
| Hook exclusive to parent component | `components/{domain}/{parent}/hooks/{hook}/index.ts` | `{hooksRoot}/utils/{hook}/index.ts` |

---

## Hooks Root Resolution

Choose the first existing path and use it as `{hooksRoot}`:

1. `src/hooks/`
2. `app/hooks/`
3. `hooks/`

All hook path rules in this document are expressed relative to `{hooksRoot}`.

---

## Hooks Folder Structure

```
{hooksRoot}/
├── apis/
│   ├── queries/         # useQuery (GET)
│   │   └── useGetUser/index.ts
│   └── mutations/       # useMutation (POST/PUT/DELETE)
│       └── useLogin/index.ts
└── utils/               # 유틸 훅 (2+ 컴포넌트에서 사용)
    └── useDebounce/index.ts
```

### Hook Placement Decision Flow

```
1. API 호출 훅?        → {hooksRoot}/apis/ (queries/ 또는 mutations/)
2. 2+ 곳에서 사용?     → {hooksRoot}/utils/
3. 특정 페이지 전용?   → app/{feature}/hooks/
4. 특정 컴포넌트 전용? → components/{path}/hooks/
```

- When a dedicated hook is also needed elsewhere, move it to `{hooksRoot}/utils/`
- API hooks are always fixed at `{hooksRoot}/apis/`

---

## API Hook Breakdown (queries vs mutations)

```
{hooksRoot}/apis/
├── queries/       # 데이터 조회 (GET): useGetUser, useGetProblems
└── mutations/     # 데이터 변경 (POST/PUT/DELETE): useLogin, useCreateMemo
```
