"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface FieldErrors {
  email?: string;
  password?: string;
}

interface UseLoginFormReturn {
  /** Current email value */
  email: string;
  /** Current password value */
  password: string;
  /** Per-field validation errors */
  fieldErrors: FieldErrors;
  /** Update email value */
  setEmail: (value: string) => void;
  /** Update password value */
  setPassword: (value: string) => void;
  /** Handle email input change event */
  handleEmailChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Handle password input change event */
  handlePasswordChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Validate email on blur */
  handleEmailBlur: () => void;
  /** Validate password on blur */
  handlePasswordBlur: () => void;
  /** Validate all fields. Returns true if valid. */
  validateAll: () => boolean;
  /** Reset the form to initial state */
  reset: () => void;
}

/**
 * Custom hook for login form state management.
 * Handles field values, per-field validation on blur, and full-form validation.
 * Does NOT handle API calls -- compose with useLogin for that.
 */
export function useLoginForm(): UseLoginFormReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    [],
  );

  const handleEmailBlur = useCallback(() => {
    const err = validateEmail(email);
    setFieldErrors((prev) => {
      if (err) return { ...prev, email: err };
      const { email: _, ...rest } = prev;
      return rest;
    });
  }, [email]);

  const handlePasswordBlur = useCallback(() => {
    const err = validatePassword(password);
    setFieldErrors((prev) => {
      if (err) return { ...prev, password: err };
      const { password: _, ...rest } = prev;
      return rest;
    });
  }, [password]);

  const validateAll = useCallback((): boolean => {
    const errs: FieldErrors = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, password]);

  const reset = useCallback(() => {
    setEmail("");
    setPassword("");
    setFieldErrors({});
  }, []);

  return {
    email,
    password,
    fieldErrors,
    setEmail,
    setPassword,
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
    validateAll,
    reset,
  };
}
