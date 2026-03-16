"use client";

export interface ButtonProps {
  label: string;
  tone?: "primary" | "secondary";
}

const Button = ({ label, tone = "primary" }: ButtonProps) => {
  return (
    <button
      type="button"
      className={
        tone === "primary"
          ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          : "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      }
    >
      {label}
    </button>
  );
};

export default Button;
