"use client";

import Link from "next/link";
import useGetOrderDetail from "@/hooks/apis/order/queries/useGetOrderDetail";

export default function Home() {
  const { data: order, isLoading, isError, error } = useGetOrderDetail({
    orderId: "order-1",
  });

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">TestApp</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        할 일 관리 애플리케이션에 오신 것을 환영합니다
      </p>

      <section className="mt-8 w-full max-w-md" data-testid="order-section">
        {isLoading && (
          <p className="text-zinc-500" data-testid="order-loading">
            주문 정보를 불러오는 중...
          </p>
        )}
        {isError && (
          <p className="text-red-500" data-testid="order-error">
            주문 조회 실패: {error?.message ?? "알 수 없는 오류"}
          </p>
        )}
        {order && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700" data-testid="order-detail">
            <p className="text-sm text-zinc-500">주문 ID: {order.id}</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {order.totalAmount.toLocaleString()}원
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              상태: {order.status}
            </p>
          </div>
        )}
      </section>

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
