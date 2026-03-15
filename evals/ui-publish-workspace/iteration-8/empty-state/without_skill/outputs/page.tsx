"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTodos } from "@/contexts/TodoContext";
import TodoForm from "@/components/TodoForm";
import TodoItem from "@/components/TodoItem";
import SearchFilter from "@/components/SearchFilter";
import EmptyState from "@/components/EmptyState";
import ErrorMessage from "@/components/ErrorMessage";

type FilterType = "all" | "active" | "completed";

export default function TodosPageWrapper() {
  return (
    <Suspense>
      <TodosPage />
    </Suspense>
  );
}

function TodosPage() {
  const { isAuthenticated, mounted } = useAuth();
  const { todos, addTodo, updateTodo, deleteTodo, toggleTodo, simulateError, setSimulateError } = useTodos();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push("/login");
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (searchParams.get("simulate_error") === "true") setSimulateError(true);
  }, [searchParams, setSimulateError]);

  if (!mounted || !isAuthenticated) return null;

  const filtered = todos.filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = (text: string) => {
    const err = addTodo(text);
    if (err) setError(err);
    else setError(null);
    return err;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">할 일 목록</h1>
        {simulateError && (
          <button
            onClick={() => setSimulateError(false)}
            className="text-xs text-zinc-400 hover:text-zinc-600"
            data-testid="disable-error-simulation"
          >
            에러 시뮬레이션 해제
          </button>
        )}
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} onDismiss={() => setError(null)} /></div>}

      <div className="mt-6 space-y-4">
        <TodoForm onSubmit={handleAdd} />
        <SearchFilter search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} />
      </div>

      <div className="mt-6 space-y-2">
        {todos.length === 0 ? (
          <EmptyState title="아직 할 일이 없습니다" description="위 입력란에서 새로운 할 일을 추가해보세요" />
        ) : filtered.length === 0 ? (
          <EmptyState title="검색 결과가 없습니다" description="다른 검색어나 필터를 시도해보세요" />
        ) : (
          filtered.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onUpdate={updateTodo}
              onDelete={deleteTodo}
            />
          ))
        )}
      </div>
    </div>
  );
}
