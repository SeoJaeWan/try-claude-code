"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTodos } from "@/contexts/TodoContext";
import StatsCard from "@/components/StatsCard";
import TodoForm from "@/components/TodoForm";
import NotificationList from "@/components/NotificationList";

export default function DashboardPage() {
  const { user, isAuthenticated, mounted } = useAuth();
  const { todos, addTodo } = useTodos();
  const router = useRouter();

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push("/login");
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  const completed = todos.filter((t) => t.completed).length;
  const pending = todos.length - completed;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50" data-testid="greeting">
        안녕하세요, {user?.name}님
      </h1>
      <p className="mt-1 text-sm text-zinc-500">오늘도 좋은 하루 되세요!</p>
      <p className="mt-1 text-xs text-zinc-400" data-testid="current-date">
        {new Date().toLocaleDateString("ko-KR")}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="전체 할 일" value={todos.length} testId="stat-total" />
        <StatsCard label="완료" value={completed} testId="stat-completed" />
        <StatsCard label="진행중" value={pending} testId="stat-pending" />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">빠른 추가</h2>
        <TodoForm onSubmit={addTodo} />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">알림</h2>
        <NotificationList />
      </div>

      <div className="mt-6">
        <Link
          href="/todos"
          className="text-sm text-blue-600 hover:text-blue-800"
          data-testid="go-to-todos"
        >
          전체 할 일 목록 보기 &rarr;
        </Link>
      </div>
    </div>
  );
}
