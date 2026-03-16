# Eval 1: Login Hook Split - With Skill Transcript

## Task Description

로그인 페이지(`app/login/page.tsx`)의 인라인 상태(email, password, errors, generalError)와 제출/검증 로직을 프로젝트 컨벤션에 맞게 커스텀 훅(`useLoginForm`)으로 분리한다. 페이지 컴포넌트는 UI 조합만 담당하도록 정리한다.

## Steps Taken

### Step 1: Read SKILL.md

`plugin/skills/frontend-dev/SKILL.md`를 읽어 CLI-first 워크플로우를 확인했다. 핵심 원칙:
- 모든 훅 파일은 `tcf` CLI로 생성해야 한다
- 컴포넌트에 인라인 로직(fetch, useState 등)이 있으면 커스텀 훅으로 추출한다
- 컴포넌트 파일은 만들지 않고, 훅만 생성하여 기존 컴포넌트에 연결한다

### Step 2: Read Fixture Files

읽은 파일들:
- `features/frontend-dev-fixture/package.json` - Next.js 16, React 19 프로젝트
- `features/frontend-dev-fixture/app/login/page.tsx` - 인라인 상태와 로직이 포함된 로그인 페이지
- `features/frontend-dev-fixture/lib/validators.ts` - 이메일/비밀번호 검증 함수
- `features/frontend-dev-fixture/contexts/AuthContext.tsx` - login 함수를 제공하는 AuthContext

### Step 3: Run tcf --help

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs --help
```

사용 가능한 명령어 확인:
- `hook` - 비API 훅 파일 생성 (경로: `hooks/utils/{domain}`)
- `apiHook` - TanStack Query API 훅 생성 (경로: `hooks/apis/{domain}/{queries|mutations}`)
- `batch` - 여러 명령 일괄 실행

로그인 폼 로직은 API 호출이 아닌 컨텍스트 기반이므로 `hook` 명령어를 사용한다.

### Step 4: Scaffold Hook with tcf --apply

```bash
cd features/frontend-dev-fixture && node ../../packages/dev-cli/bin/tcf.mjs hook --json '{"name":"useLoginForm","path":"hooks/utils/login"}' --apply
```

결과:
```json
{
  "ok": true,
  "command": "hook",
  "normalizedSpec": {
    "name": "useLoginForm",
    "path": "hooks/utils/login"
  },
  "files": [
    {
      "path": "hooks/utils/login/useLoginForm/index.ts",
      "bytes": 80,
      "status": "written"
    }
  ]
}
```

스캐폴드 생성 후 비즈니스 로직을 구현했다.

### Step 5: Implement useLoginForm Hook

`features/frontend-dev-fixture/hooks/utils/login/useLoginForm/index.ts`에 로그인 폼의 모든 상태와 로직을 구현:

- 상태: `email`, `password`, `errors`, `generalError`
- 핸들러: `handleValidate`, `handleBlurEmail`, `handleBlurPassword`, `handleSubmit`
- 네이밍 규칙: 내부 핸들러는 `handle*` 접두사 사용 (프로필 enforced rules 준수)
- 함수 스타일: arrow function (enforced `functionStyle: "arrow"`)

### Step 6: Refactor page.tsx

`features/frontend-dev-fixture/app/login/page.tsx`를 리팩토링:
- `useState`, `useRouter`, `useAuth`, validators import 모두 제거
- `useLoginForm` 훅만 import
- 모든 상태와 핸들러를 훅에서 destructure
- 페이지는 순수하게 UI 조합만 담당

## Files Created

### `hooks/utils/login/useLoginForm/index.ts` (NEW)

```ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword } from "@/lib/validators";

const useLoginForm = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleValidate = () => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    return errs;
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
      err
        ? { ...prev, password: err }
        : (({ password: _, ...rest }) => rest)(prev)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errs = handleValidate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const err = login(email, password);
    if (err) {
      setGeneralError(err);
    } else {
      router.push("/dashboard");
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    generalError,
    handleBlurEmail,
    handleBlurPassword,
    handleSubmit,
  };
};

export default useLoginForm;
```

## Files Modified

### `app/login/page.tsx` (MODIFIED)

```tsx
"use client";

import Link from "next/link";
import useLoginForm from "@/hooks/utils/login/useLoginForm";

export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    generalError,
    handleBlurEmail,
    handleBlurPassword,
    handleSubmit,
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
            onBlur={handleBlurEmail}
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
            onBlur={handleBlurPassword}
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
