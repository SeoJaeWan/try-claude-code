"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface LoginFormState {
  email: string;
  password: string;
  errors: Record<string, string>;
}

interface UseLoginFormReturn {
  email: string;
  password: string;
  errors: Record<string, string>;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
  validate: () => Record<string, string>;
  resetErrors: () => void;
}

export function useLoginForm(): UseLoginFormReturn {
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
    errors: {},
  });

  const setEmail = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, email: value }));
  }, []);

  const setPassword = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, password: value }));
  }, []);

  const handleEmailBlur = useCallback(() => {
    setFormState((prev) => {
      const err = validateEmail(prev.email);
      if (err) {
        return { ...prev, errors: { ...prev.errors, email: err } };
      }
      const { email: _, ...restErrors } = prev.errors;
      return { ...prev, errors: restErrors };
    });
  }, []);

  const handlePasswordBlur = useCallback(() => {
    setFormState((prev) => {
      const err = validatePassword(prev.password);
      if (err) {
        return { ...prev, errors: { ...prev.errors, password: err } };
      }
      const { password: _, ...restErrors } = prev.errors;
      return { ...prev, errors: restErrors };
    });
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(formState.email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(formState.password);
    if (pwErr) errs.password = pwErr;

    setFormState((prev) => ({ ...prev, errors: errs }));
    return errs;
  }, [formState.email, formState.password]);

  const resetErrors = useCallback(() => {
    setFormState((prev) => ({ ...prev, errors: {} }));
  }, []);

  return {
    email: formState.email,
    password: formState.password,
    errors: formState.errors,
    setEmail,
    setPassword,
    handleEmailBlur,
    handlePasswordBlur,
    validate,
    resetErrors,
  };
}
