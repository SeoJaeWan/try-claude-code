"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { isAuthenticated, mounted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (mounted && isAuthenticated) router.push("/dashboard");
  }, [mounted, isAuthenticated, router]);

  if (!mounted) return null;
  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">TestApp</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        할 일 관리 애플리케이션에 오신 것을 환영합니다
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="home-login"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
          data-testid="home-signup"
        >
          회원가입
        </Link>
      </div>
    </div>
  );
}
