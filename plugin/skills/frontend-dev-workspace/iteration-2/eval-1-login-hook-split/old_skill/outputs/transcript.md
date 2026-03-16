# Eval 1: Login Hook Split (old-frontend-dev skill)

## Task Description

로그인 페이지(`app/login/page.tsx`)의 인라인 상태(useState)와 제출 로직(handleSubmit, validate, onBlur)을 프로젝트 컨벤션에 맞게 커스텀 훅으로 분리한다. 페이지 컴포넌트는 조합(composition)만 담당하도록 정리한다.

## Steps Taken

### Step 1: Read SKILL.md and coding-rules.md

- Read `plugin/skills/old-frontend-dev/SKILL.md` - understood the workflow: read coding rules, attempt boilerplate generation, extract inline logic into custom hooks.
- Read `plugin/skills/old-frontend-dev/references/coding-rules.md` - understood hook naming (`use` + verb + resource), folder structure (`{hooksRoot}/` resolution), hook placement decision flow, and directory pattern (`{hookName}/index.ts`).

### Step 2: Read fixture files

- `features/frontend-dev-fixture/package.json` - Next.js 16, React 19, pnpm.
- `features/frontend-dev-fixture/app/login/page.tsx` - Login page with inline useState (email, password, errors, generalError), validate function, handleSubmit, and onBlur handlers.
- `features/frontend-dev-fixture/lib/validators.ts` - validateEmail, validatePassword utility functions.
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` - AuthProvider with login/signup/logout methods. login returns `string | null`.

### Step 3: Resolve hooksRoot

Per coding-rules.md, checked paths in order:
1. `src/hooks/` - not found
2. `app/hooks/` - not found
3. `hooks/` - **found** (existing hooks at `hooks/apis/`)

`{hooksRoot}` = `hooks/`

### Step 4: Hook placement decision

Following the hook placement decision flow:
1. API call hook? - No (login logic uses AuthContext, not a direct API call)
2. Used in 2+ places? - No (only used in login page)
3. **Page-specific? - Yes** -> `app/login/hooks/`

Placement: `app/login/hooks/useLoginForm/index.ts`

### Step 5: Attempt boilerplate generation

Ran:
```bash
node references/coding-rules/scripts/generate.mjs hook useLoginForm --type form
```

Generated boilerplate skeleton with `index.ts` and `__tests__/index.test.ts`.

### Step 6: Implement useLoginForm hook

Created `features/frontend-dev-fixture/app/login/hooks/useLoginForm/index.ts` extracting all inline state and logic from the page:

- `email`, `password` state
- `errors`, `generalError` state
- `validate()` logic
- `handleSubmit()` with form validation and auth context login call
- `handleEmailBlur()` and `handlePasswordBlur()` for field-level validation on blur

### Step 7: Modify login page

Modified `features/frontend-dev-fixture/app/login/page.tsx` to:
- Remove all useState, useRouter, useAuth, validator imports
- Import only `useLoginForm` from `./hooks/useLoginForm`
- Destructure all needed values from the hook
- Page now only handles JSX composition

## Files Created

### `features/frontend-dev-fixture/app/login/hooks/useLoginForm/index.ts`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword } from "@/lib/validators";

interface UseLoginFormReturn {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  errors: Record<string, string>;
  generalError: string | null;
  handleSubmit: (e: React.FormEvent) => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
}

/**
 * useLoginForm 훅
 * 로그인 페이지의 폼 상태 관리 및 제출 로직을 담당한다.
 * @returns 폼 상태와 이벤트 핸들러
 */
const useLoginForm = (): UseLoginFormReturn => {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const err = login(email, password);
    if (err) {
      setGeneralError(err);
    } else {
      router.push("/dashboard");
    }
  };

  const handleEmailBlur = () => {
    const err = validateEmail(email);
    setErrors((prev) =>
      err ? { ...prev, email: err } : (({ email: _, ...rest }) => rest)(prev)
    );
  };

  const handlePasswordBlur = () => {
    const err = validatePassword(password);
    setErrors((prev) =>
      err
        ? { ...prev, password: err }
        : (({ password: _, ...rest }) => rest)(prev)
    );
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    generalError,
    handleSubmit,
    handleEmailBlur,
    handlePasswordBlur,
  };
};

export default useLoginForm;
```

## Files Modified

### `features/frontend-dev-fixture/app/login/page.tsx`

```typescript
"use client";

import Link from "next/link";
import useLoginForm from "./hooks/useLoginForm";

export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    generalError,
    handleSubmit,
    handleEmailBlur,
    handlePasswordBlur,
  } = useLoginForm();

  return (
    <div className="mx-auto mt-20 max-w-md">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-50">로그인</h1>

      {generalError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" data-testid="login-error">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            data-testid="login-email"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600" data-testid="email-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={handlePasswordBlur}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            data-testid="login-password"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600" data-testid="password-error">{errors.password}</p>}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="login-submit"
        >
          로그인
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-blue-600 hover:text-blue-800">회원가입</Link>
      </p>
    </div>
  );
}
```
