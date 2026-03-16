"use client";

import { ReactNode } from "react";

export interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

const Button = ({ children, variant = "primary" }: ButtonProps) => {
  return (
    <button
      type="button"
      className={
        variant === "primary"
          ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          : "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      }
    >
      {children}
    </button>
  );
};

export default Button;
