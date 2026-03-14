"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface UseLoginFormReturn {
  email: string;
  password: string;
  errors: Record<string, string>;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  validateField: (field: "email" | "password") => void;
  validateAll: () => boolean;
  resetErrors: () => void;
}

export function useLoginForm(): UseLoginFormReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback(
    (field: "email" | "password") => {
      const err =
        field === "email" ? validateEmail(email) : validatePassword(password);
      setErrors((prev) => {
        if (err) return { ...prev, [field]: err };
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    },
    [email, password]
  );

  const validateAll = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, password]);

  const resetErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    email,
    password,
    errors,
    setEmail,
    setPassword,
    validateField,
    validateAll,
    resetErrors,
  };
}
