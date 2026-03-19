"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import useGetOrderDetail from "@/hooks/apis/order/queries/useGetOrderDetail";

function OrderDetailSection() {
  const { data, isLoading, isError, error } = useGetOrderDetail({
    orderId: "order-1",
  });

  if (isLoading) {
    return (
      <div className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm text-zinc-500" data-testid="order-loading">
          주문 정보를 불러오는 중...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 p-4 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400" data-testid="order-error">
          주문 정보를 불러오지 못했습니다: {error?.message}
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800" data-testid="order-detail">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">최근 주문</h2>
      <dl className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex gap-2">
          <dt className="font-medium">주문 ID:</dt>
          <dd data-testid="order-id">{data.id}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">상태:</dt>
          <dd data-testid="order-status">{data.status}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">금액:</dt>
          <dd data-testid="order-amount">{data.totalAmount.toLocaleString()}원</dd>
        </div>
      </dl>
    </div>
  );
}

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
      <OrderDetailSection />
    </div>
  );
}
