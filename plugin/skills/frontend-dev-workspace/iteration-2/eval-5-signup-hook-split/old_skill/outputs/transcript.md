# Eval 5: Signup Hook Split (old-frontend-dev skill)

## Task Description

회원가입 페이지도 프로젝트 컨벤션에 맞게 훅 조합 구조로 정리해줘. 로그인 페이지와 비슷한 수준의 경계로 맞춰줘.

## Steps Taken

### Step 1: Read skill instructions

Read `plugin/skills/old-frontend-dev/SKILL.md` and `plugin/skills/old-frontend-dev/references/coding-rules.md` to understand:
- Hook naming conventions: `use` + verb + resource pattern
- Folder structure: `{hooksRoot}/apis/mutations/` for auth/data-modifying hooks, `{hooksRoot}/utils/` for utility hooks
- Hook file convention: `{hookName}/index.ts` directory pattern
- Auth-related hooks (login, register) are mutations

### Step 2: Read seed context files

Read the following files:
- `features/frontend-dev-fixture/package.json` - Next.js 16 project with React 19
- `features/frontend-dev-fixture/app/signup/page.tsx` - Signup page with all inline logic (useState, validation, submit)
- `features/frontend-dev-fixture/lib/validators.ts` - Shared validation functions (validateEmail, validatePassword, validateName)
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` - Auth context with signup method

### Step 3: Analyze existing patterns

Read `app/login/page.tsx` and `hooks/utils/login/useLoginForm/index.ts` to understand the login page's hook extraction pattern. Also checked the existing hooks directory structure under `hooks/apis/` and `hooks/utils/`.

### Step 4: Determine hook boundaries

Based on scenario 05 expected outcome:
- Form state hook: `hooks/utils/auth/useSignupForm/index.ts` - manages form fields, validation, blur handlers
- Mutation hook: `hooks/apis/auth/mutations/usePostSignup/index.ts` - handles submit flow and API call
- Page: simplified to UI shell + hook composition

### Step 5: Create useSignupForm hook

Created `hooks/utils/auth/useSignupForm/index.ts` containing:
- All form state (name, email, password, confirmPassword, errors)
- Validation logic (handleValidate)
- Blur handlers for each field (handleBlurName, handleBlurEmail, handleBlurPassword, handleBlurConfirmPassword)
- Confirm password validation preserved

### Step 6: Create usePostSignup hook

Created `hooks/apis/auth/mutations/usePostSignup/index.ts` containing:
- generalError state for API-level errors
- handleSubmit that takes form event, fields, validate function, and setErrors
- Calls AuthContext's signup method and handles navigation on success

### Step 7: Update signup page

Updated `app/signup/page.tsx` to:
- Import and compose useSignupForm and usePostSignup hooks
- Remove all direct useState and business logic
- Page is now a UI shell with hook wiring only

## Files Created

### `hooks/utils/auth/useSignupForm/index.ts` (NEW)

```typescript
"use client";

import { useState } from "react";
import { validateEmail, validatePassword, validateName } from "@/lib/validators";

const useSignupForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleValidate = () => {
    const errs: Record<string, string> = {};
    const nameErr = validateName(name);
    if (nameErr) errs.name = nameErr;
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    if (password !== confirmPassword) errs.confirmPassword = "비밀번호가 일치하지 않습니다";
    return errs;
  };

  const handleBlurName = () => {
    const err = validateName(name);
    setErrors((prev) =>
      err ? { ...prev, name: err } : (({ name: _, ...rest }) => rest)(prev)
    );
  };

  const handleBlurEmail = () => {
    const err = validateEmail(email);
    setErrors((prev) =>
      err ? { ...prev, email: err } : (({ email: _, ...rest }) => rest)(prev)
    );
  };

  const handleBlurPassword = () => {
    const err = validatePassword(password);
    setErrors((prev) =>
      err ? { ...prev, password: err } : (({ password: _, ...rest }) => rest)(prev)
    );
  };

  const handleBlurConfirmPassword = () => {
    if (password !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "비밀번호가 일치하지 않습니다" }));
    } else {
      setErrors((prev) => {
        const { confirmPassword: _, ...rest } = prev;
        return rest;
      });
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    errors,
    setErrors,
    handleValidate,
    handleBlurName,
    handleBlurEmail,
    handleBlurPassword,
    handleBlurConfirmPassword,
  };
};

export default useSignupForm;
```

### `hooks/apis/auth/mutations/usePostSignup/index.ts` (NEW)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const usePostSignup = () => {
  const { signup } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = (
    e: React.FormEvent,
    fields: { name: string; email: string; password: string },
    validate: () => Record<string, string>,
    setErrors: (errs: Record<string, string>) => void
  ) => {
    e.preventDefault();
    setGeneralError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const err = signup(fields.email, fields.password, fields.name);
    if (err) {
      setGeneralError(err);
    } else {
      router.push("/dashboard");
    }
  };

  return {
    generalError,
    handleSubmit,
  };
};

export default usePostSignup;
```

### `app/signup/page.tsx` (MODIFIED)

```typescript
"use client";

import Link from "next/link";
import useSignupForm from "@/hooks/utils/auth/useSignupForm";
import usePostSignup from "@/hooks/apis/auth/mutations/usePostSignup";

export default function SignupPage() {
  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    errors,
    setErrors,
    handleValidate,
    handleBlurName,
    handleBlurEmail,
    handleBlurPassword,
    handleBlurConfirmPassword,
  } = useSignupForm();

  const { generalError, handleSubmit } = usePostSignup();

  return (
    <div className="mx-auto mt-20 max-w-md">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-50">회원가입</h1>

      {generalError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" data-testid="signup-error">
          {generalError}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, { name, email, password }, handleValidate, setErrors)} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이름</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlurName}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            data-testid="signup-name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600" data-testid="name-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleBlurEmail}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            data-testid="signup-email"
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
            onBlur={handleBlurPassword}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            data-testid="signup-password"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600" data-testid="password-error">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">비밀번호 확인</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={handleBlurConfirmPassword}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            data-testid="signup-confirm-password"
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600" data-testid="confirm-password-error">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="signup-submit"
        >
          회원가입
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-blue-600 hover:text-blue-800">로그인</Link>
      </p>
    </div>
  );
}
```
