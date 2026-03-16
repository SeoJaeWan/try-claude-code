"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface UseLoginFormReturn {
  /** Current email value. */
  email: string;
  /** Current password value. */
  password: string;
  /** Per-field validation errors keyed by field name. */
  errors: Record<string, string>;
  /** Update email value. */
  setEmail: (value: string) => void;
  /** Update password value. */
  setPassword: (value: string) => void;
  /** Validate a single field on blur. */
  validateField: (field: "email" | "password") => void;
  /** Validate all fields. Returns true if the form is valid. */
  validateAll: () => boolean;
}

/**
 * Custom hook that manages login form state and client-side validation.
 * Keeps UI concerns (field values, per-field errors) separate from API logic.
 */
export function useLoginForm(): UseLoginFormReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback(
    (field: "email" | "password") => {
      const value = field === "email" ? email : password;
      const validator = field === "email" ? validateEmail : validatePassword;
      const err = validator(value);

      setErrors((prev) => {
        if (err) return { ...prev, [field]: err };
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    },
    [email, password],
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

  return {
    email,
    password,
    errors,
    setEmail,
    setPassword,
    validateField,
    validateAll,
  };
}
