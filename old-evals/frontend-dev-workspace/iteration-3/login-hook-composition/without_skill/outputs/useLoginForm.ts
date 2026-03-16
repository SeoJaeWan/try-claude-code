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
  validateAll: () => Record<string, string>;
  resetErrors: () => void;
  setGeneralError: (error: string | null) => void;
  generalError: string | null;
}

export function useLoginForm(): UseLoginFormReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

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

  const validateAll = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    setErrors(errs);
    return errs;
  }, [email, password]);

  const resetErrors = useCallback(() => {
    setErrors({});
    setGeneralError(null);
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
    setGeneralError,
    generalError,
  };
}
