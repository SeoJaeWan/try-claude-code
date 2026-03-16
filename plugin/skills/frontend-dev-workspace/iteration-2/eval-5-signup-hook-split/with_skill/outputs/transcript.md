# Eval 5: Signup Hook Split Transcript

## Task Description

회원가입 페이지도 프로젝트 컨벤션에 맞게 훅 조합 구조로 정리해줘. 로그인 페이지와 비슷한 수준의 경계로 맞춰줘.

Extract inline form state and submit logic from the signup page into convention-compliant custom hooks, matching the same boundary level as the login page.

## Steps Taken

### Step 1: Read SKILL.md

Read `plugin/skills/frontend-dev/SKILL.md` to understand the CLI-first workflow. Key rules:
- All hook files must be created via `tcf` CLI (never manually)
- Run `tcf --help` first to discover commands and policies
- After scaffolding, implement business logic inside generated files
- Do NOT create component files; only create hooks and connect them

### Step 2: Read fixture files

Read the following seed context files:
- `features/frontend-dev-fixture/package.json` - Next.js 16 + React 19 project
- `features/frontend-dev-fixture/app/signup/page.tsx` - Signup page with inline state, validation, and submit logic
- `features/frontend-dev-fixture/lib/validators.ts` - Shared validators (validateEmail, validatePassword, validateName)
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` - Auth context providing signup/login/logout

Also read `app/login/page.tsx` to understand the target boundary level and `scenarios/05-compose-signup-hooks.md` for expected outcomes.

### Step 3: Run tcf --help

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs --help
```

Output confirmed available commands: `hook`, `apiHook`, `batch`, `type`, `props`, `function`, `queryKey`, `endpoint`, `mapper`, `hookReturn`.

Key policies discovered:
- `hook` command: path must follow `hooks/utils/{domain}` pattern
- `apiHook` command: path must follow `hooks/apis/{domain}/{queries|mutations}` pattern
- Naming: hooks use `use*` prefix; API mutation hooks use `usePost*/usePut*/usePatch*/useDelete*`
- Forbidden prefixes: `useFetch`, `useSave`, `useSubmit`

### Step 4: Scaffold hooks via tcf

#### 4a. Scaffold useSignupForm (form state hook)

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs hook --json '{"name":"useSignupForm","path":"hooks/utils/auth"}' --apply
```

Output:
```json
{
  "ok": true,
  "command": "hook",
  "files": [
    {
      "path": "hooks/utils/auth/useSignupForm/index.ts",
      "bytes": 82,
      "status": "written"
    }
  ]
}
```

#### 4b. Scaffold usePostSignup (submit/mutation hook)

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs apiHook --json '{"name":"usePostSignup","path":"hooks/apis/auth/mutations","kind":"mutation","method":"POST"}' --apply
```

Output:
```json
{
  "ok": true,
  "command": "apiHook",
  "files": [
    {
      "path": "hooks/apis/auth/mutations/usePostSignup/index.ts",
      "bytes": 241,
      "status": "written"
    }
  ]
}
```

### Step 5: Implement business logic and refactor page

Implemented `useSignupForm` with form field states, validation, and blur handlers. Implemented `usePostSignup` with signup submission flow using AuthContext. Refactored `page.tsx` to be a pure UI shell that composes the two hooks.

## Files Created/Modified

### Created: `hooks/utils/auth/useSignupForm/index.ts`

```ts
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

### Created: `hooks/apis/auth/mutations/usePostSignup/index.ts`

```ts
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

### Modified: `app/signup/page.tsx`

```tsx
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
