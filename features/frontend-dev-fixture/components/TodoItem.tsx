"use client";

import { useState } from "react";
import type { Todo } from "@/lib/types";

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, text: string) => string | null;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    const err = onUpdate(todo.id, editText);
    if (err) {
      setEditError(err);
    } else {
      setEditing(false);
      setEditError(null);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800" data-testid={`todo-item-${todo.id}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="h-4 w-4 rounded border-zinc-300"
        data-testid={`todo-checkbox-${todo.id}`}
        aria-label={`${todo.text} 완료 표시`}
      />

      {editing ? (
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => { setEditText(e.target.value); setEditError(null); }}
              className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              data-testid={`todo-edit-input-${todo.id}`}
              autoFocus
            />
            <button onClick={handleSave} className="text-sm text-blue-600 hover:text-blue-800" data-testid={`todo-save-${todo.id}`}>
              저장
            </button>
            <button onClick={() => { setEditing(false); setEditText(todo.text); setEditError(null); }} className="text-sm text-zinc-500" data-testid={`todo-cancel-${todo.id}`}>
              취소
            </button>
          </div>
          {editError && <p className="text-xs text-red-600">{editError}</p>}
        </div>
      ) : (
        <>
          <span
            className={`flex-1 text-sm ${todo.completed ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}
            data-testid={`todo-text-${todo.id}`}
          >
            {todo.text}
          </span>
          <button onClick={() => { setEditing(true); setEditText(todo.text); }} className="text-sm text-zinc-500 hover:text-zinc-700" data-testid={`todo-edit-${todo.id}`}>
            수정
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-2" data-testid={`todo-confirm-delete-${todo.id}`}>
              <span className="text-xs text-zinc-500">삭제할까요?</span>
              <button onClick={() => onDelete(todo.id)} className="text-xs text-red-600 font-medium" data-testid={`todo-confirm-yes-${todo.id}`}>
                예
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-500" data-testid={`todo-confirm-no-${todo.id}`}>
                아니오
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-500 hover:text-red-700" data-testid={`todo-delete-${todo.id}`}>
              삭제
            </button>
          )}
        </>
      )}
    </div>
  );
}
