"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  testId?: string;
}

export default function MultiSelect({ label, options, selected, onChange, testId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  };

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              data-testid={`multiselect-chip-${s}`}
            >
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="hover:text-blue-600"
                aria-label={`${s} 제거`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        data-testid={testId ? `${testId}-toggle` : "multiselect-toggle"}
      >
        {selected.length > 0 ? `${selected.length}개 선택됨` : "선택하세요"}
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900" data-testid="multiselect-dropdown">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              data-testid={`multiselect-option-${opt}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
