# Frontend-Dev Skill Simulation: useAuth Hook for Login Page

## Task

"로그인 페이지에 useAuth 커스텀 훅을 만들고 API 연동해줘"
(Create a useAuth custom hook for the login page and integrate it with the API)

---

## Stack Detection

Based on the skill file and coding-rules references, the detected/assumed stack is:

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| UI | React 18+, Tailwind CSS, shadcn/ui |
| State Management | TanStack Query (React Query) |
| Testing | Vitest + happy-dom, MSW for API mocking |
| Package Manager | pnpm |

---

## Workflow Steps (Simulated)

### Step 1: Read References (Documentation Phase)

The skill instructs reading these files first:

1. `.claude/try-claude/references/coding-rules/` - All coding rules (read: folder-structure.md, naming.md, typescript.md, code-style.md, testing.md)
2. `.claude/try-claude/references/design/` - Design system
3. `.claude/try-claude/codemaps/frontend.md` - Existing pages/routes/components (not found in this repo)
4. `.claude/try-claude/references/domain.md` - User scenarios (not found; sample-domain.md is a placeholder)
5. `tailwind.config.js`, `app/globals.css`, `components/ui/` - Actual design values

### Step 2: Read Plan

- Check `.claude/try-claude/plans/{task-name}/plan.md` for implementation plan
- Check `.claude/try-claude/plans/{task-name}/tests/manifest.md` for test file paths
- In this simulation, no plan exists, so we proceed with manual implementation

### Step 3: Resolve hooksRoot

Per `folder-structure.md`, the hooksRoot resolution order is:
1. `src/hooks/` (check first)
2. `app/hooks/` (check second)
3. `hooks/` (check third)

For a typical Next.js 15 App Router project, the likely path is `src/hooks/` or `app/hooks/`.

### Step 4: Boilerplate Generation (if scripts exist)

```bash
# API hook boilerplate for login mutation
node .claude/try-claude/references/coding-rules/scripts/generate.mjs api-hook useLogin --method mutation

# Custom hook boilerplate for auth state
node .claude/try-claude/references/coding-rules/scripts/generate.mjs hook useAuth

# Test suite boilerplate
node .claude/try-claude/references/coding-rules/scripts/generate.mjs test-suite useAuth --type hook
node .claude/try-claude/references/coding-rules/scripts/generate.mjs test-suite useLogin --type hook
```

If scripts are not found, implement manually (as is the case here).

### Step 5: TDD Workflow - Copy Tests and Red Verification

1. Copy test files from plan artifacts to source tree
2. Run `pnpm test` to verify tests FAIL (Red phase)
3. Since no plan tests exist in this simulation, tests would be written manually

### Step 6: Implementation

Based on the coding conventions, the following files would be created:

---

## Files to Create

### 1. Type Definitions

**File:** `{hooksRoot}/apis/types/auth.ts`

```typescript
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface AuthState {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Rationale:** Per naming.md, types follow clear naming. Per typescript.md, use proper type definitions instead of `as` assertions.

### 2. API Endpoints Constants

**File:** `{hooksRoot}/apis/endpoints.ts`

```typescript
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  GET_ME: '/api/auth/me',
};
```

**Rationale:** Per naming.md, endpoint keys follow `VERB_RESOURCE` pattern.

### 3. useLogin Mutation Hook

**File:** `{hooksRoot}/apis/mutations/useLogin/index.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../endpoints';
import type { LoginCredentials, AuthResponse } from '../types/auth';

const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await fetch(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};

export const useLogin = () => {
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      localStorage.setItem('token', data.accessToken);
    },
  });
};
```

**Rationale:**
- Per naming.md: Auth hooks use `use{Action}` pattern -> `useLogin`
- Per folder-structure.md: API mutation hooks go in `{hooksRoot}/apis/mutations/`
- Each hook in its own folder with `index.ts`

### 4. useAuth Custom Hook (Page-Specific)

**File:** `app/(auth)/login/hooks/useAuth/index.ts`

```typescript
import { useLogin } from '{hooksRoot}/apis/mutations/useLogin';
import type { LoginCredentials } from '{hooksRoot}/apis/types/auth';

export const useAuth = () => {
  const { mutate: login, isPending: isLoading, error, isSuccess } = useLogin();

  const handleLogin = (credentials: LoginCredentials) => {
    login(credentials);
  };

  return {
    login: handleLogin,
    isLoading,
    error,
    isSuccess,
  };
};
```

**Rationale:**
- Per folder-structure.md: Page-specific hooks go in `app/{feature}/hooks/`
- This hook is specific to the login page, so it lives under `app/(auth)/login/hooks/`
- If later reused, it would migrate to `{hooksRoot}/utils/`

### 5. useLoginForm Hook (Form State)

**File:** `app/(auth)/login/hooks/useLoginForm/index.ts`

```typescript
import { useState } from 'react';
import type { LoginCredentials } from '{hooksRoot}/apis/types/auth';

export const useLoginForm = () => {
  const [form, setForm] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const handleChange = (field: keyof LoginCredentials) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const reset = () => {
    setForm({ email: '', password: '' });
  };

  return { form, handleChange, reset };
};
```

**Rationale:** Per folder-structure.md, the example shows `useLoginForm` as a separate hook from login logic.

### 6. Login Page Component (Hook Composition)

**File:** `app/(auth)/login/page.tsx`

```typescript
'use client';

import { useAuth } from './hooks/useAuth';
import { useLoginForm } from './hooks/useLoginForm';
import { LoginFormUI } from './components/LoginFormUI';

const LoginPage = () => {
  const { form, handleChange } = useLoginForm();
  const { login, isLoading } = useAuth();

  const handleSubmit = () => login(form);

  return (
    <LoginFormUI
      form={form}
      onChange={handleChange}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
};

export default LoginPage;
```

**Rationale:**
- Per folder-structure.md Core Principle: "Component = UI + Composition of Custom Hooks"
- Components do NOT implement logic directly
- All logic extracted into custom hooks
- Component only combines hooks in handlers
- Per code-style.md: props destructured inside function body
- Per naming.md: handlers use `handle` prefix, callbacks use `on` prefix

### 7. Unit Tests

**File:** `{hooksRoot}/apis/mutations/useLogin/__tests__/index.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useLogin } from '../index';

describe('useLogin', () => {
  it('로그인 성공 시 토큰을 저장한다', async () => {
    // Arrange
    const mockCredentials = { email: 'test@example.com', password: '1234' };

    // Act
    const { result } = renderHook(() => useLogin());
    await act(() => result.current.mutate(mockCredentials));

    // Assert
    expect(localStorage.getItem('token')).toBeTruthy();
  });

  it('로그인 실패 시 에러를 반환한다', async () => {
    // Arrange
    const mockCredentials = { email: 'wrong@example.com', password: 'wrong' };

    // Act
    const { result } = renderHook(() => useLogin());
    await act(() => result.current.mutate(mockCredentials));

    // Assert
    expect(result.current.error).toBeTruthy();
  });
});
```

**File:** `app/(auth)/login/hooks/useAuth/__tests__/index.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAuth } from '../index';

describe('useAuth', () => {
  it('login 함수를 제공한다', () => {
    // Arrange & Act
    const { result } = renderHook(() => useAuth());

    // Assert
    expect(result.current.login).toBeDefined();
    expect(typeof result.current.login).toBe('function');
  });

  it('초기 상태에서 isLoading은 false이다', () => {
    // Arrange & Act
    const { result } = renderHook(() => useAuth());

    // Assert
    expect(result.current.isLoading).toBe(false);
  });
});
```

**Rationale:**
- Per testing.md: Korean spec names, AAA pattern required
- Per testing.md: Unit test file goes in `__tests__/index.test.ts`
- Per testing.md: Use MSW for API mocking, Vitest + happy-dom runtime

---

## Verification Steps

### Step 7: Run Tests (Green Verification)

```bash
pnpm test
```

All tests must pass.

### Step 8: TypeScript Check

```bash
pnpm run typecheck
# or fallback:
pnpm exec tsc --noEmit
```

No type errors allowed.

### Step 9: Lint

```bash
pnpm lint --fix
```

Repeat until clean.

### Step 10: Build Verification

```bash
pnpm build
```

Exit code 0, no blocking errors.

### Step 11: Commit

Commit changes following project git conventions.

---

## File Structure Summary

```
project/
├── app/
│   └── (auth)/
│       └── login/
│           ├── page.tsx                          # Page component (hook composition)
│           ├── components/
│           │   └── LoginFormUI/index.tsx          # UI-only component (from ui-publish)
│           └── hooks/
│               ├── useAuth/
│               │   ├── index.ts                  # Auth orchestration hook
│               │   └── __tests__/
│               │       └── index.test.ts
│               └── useLoginForm/
│                   ├── index.ts                  # Form state hook
│                   └── __tests__/
│                       └── index.test.ts
└── {hooksRoot}/
    └── apis/
        ├── endpoints.ts                          # API endpoint constants
        ├── types/
        │   └── auth.ts                           # Auth type definitions
        └── mutations/
            └── useLogin/
                ├── index.ts                      # Login API mutation hook
                └── __tests__/
                    └── index.test.ts
```

---

## Key Conventions Applied

| Convention | Source | Application |
|-----------|--------|------------|
| Component = UI + Hooks | folder-structure.md | LoginPage only composes hooks, no direct logic |
| Hook placement by scope | folder-structure.md | API hooks in `{hooksRoot}/apis/`, page hooks in `app/.../hooks/` |
| `use{Action}` naming for auth | naming.md | `useLogin`, `useAuth` |
| Props destructured in body | code-style.md | All components follow this pattern |
| `handle` prefix for handlers | naming.md | `handleSubmit`, `handleChange` |
| Korean test specs + AAA | testing.md | All test `it()` blocks use Korean descriptions |
| Tests in `__tests__/index.test.ts` | testing.md | All unit tests follow this structure |
| TDD workflow | SKILL.md + testing.md | Red -> Green -> Refactor cycle |
| Minimize `as` assertions | typescript.md | Type guards and inference preferred |
