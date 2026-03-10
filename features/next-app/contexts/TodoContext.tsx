"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Todo } from "@/lib/types";
import { validateTodoText } from "@/lib/validators";

interface TodoContextType {
  todos: Todo[];
  addTodo: (text: string) => string | null;
  updateTodo: (id: string, text: string) => string | null;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  simulateError: boolean;
  setSimulateError: (v: boolean) => void;
}

const TodoContext = createContext<TodoContextType | null>(null);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [simulateError, setSimulateError] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("todos");
    if (raw) setTodos(JSON.parse(raw));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos, loaded]);

  const addTodo = (text: string): string | null => {
    if (simulateError) return "서버 오류가 발생했습니다";
    const err = validateTodoText(text);
    if (err) return err;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTodos((prev) => [newTodo, ...prev]);
    return null;
  };

  const updateTodo = (id: string, text: string): string | null => {
    if (simulateError) return "서버 오류가 발생했습니다";
    const err = validateTodoText(text);
    if (err) return err;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: text.trim() } : t)));
    return null;
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  return (
    <TodoContext.Provider
      value={{ todos, addTodo, updateTodo, deleteTodo, toggleTodo, simulateError, setSimulateError }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
