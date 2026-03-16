"use client";

import { useState } from "react";

export default function TodoForm({ onSubmit }: { onSubmit: (text: string) => string | null }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onSubmit(text);
    if (err) {
      setError(err);
    } else {
      setText("");
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          placeholder="할 일을 입력하세요"
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          data-testid="todo-input"
        />
        {error && <p className="mt-1 text-xs text-red-600" data-testid="todo-input-error">{error}</p>}
      </div>
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        data-testid="todo-add"
      >
        추가
      </button>
    </form>
  );
}
