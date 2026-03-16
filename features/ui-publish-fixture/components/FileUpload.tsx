"use client";

import { useRef, useState } from "react";
import { validateFile } from "@/lib/validators";

interface Props {
  value?: string;
  onChange: (fileName: string | undefined) => void;
}

export default function FileUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFile(file);
    if (err) {
      setError(err);
      onChange(undefined);
    } else {
      setError(null);
      onChange(file.name);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        data-testid="file-upload-input"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        data-testid="file-upload-button"
      >
        {value ? `선택됨: ${value}` : "파일 선택"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600" data-testid="file-upload-error">{error}</p>}
    </div>
  );
}
