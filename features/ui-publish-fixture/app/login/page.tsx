"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword } from "@/lib/validators";

export default function LoginPage() {
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
            onBlur={() => { const err = validateEmail(email); setErrors((prev) => err ? { ...prev, email: err } : (({ email: _, ...rest }) => rest)(prev)); }}
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
            onBlur={() => { const err = validatePassword(password); setErrors((prev) => err ? { ...prev, password: err } : (({ password: _, ...rest }) => rest)(prev)); }}
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
