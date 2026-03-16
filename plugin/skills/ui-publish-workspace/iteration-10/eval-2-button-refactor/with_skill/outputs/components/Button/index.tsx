"use client";

export interface ButtonProps {
  label: string;
  tone?: "primary" | "secondary";
  disabled?: boolean;
  testId?: string;
}

export default function Button({
  label,
  tone = "primary",
  disabled = false,
  testId,
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      data-testid={testId}
      className={
        tone === "primary"
          ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {label}
    </button>
  );
}
