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
  validateField: (field: "email" | "password") => void;
  validateAll: () => boolean;
  resetForm: () => void;
}

const initialState: LoginFormState = {
  email: "",
  password: "",
  errors: {},
};

export function useLoginForm(): UseLoginFormReturn {
  const [formState, setFormState] = useState<LoginFormState>(initialState);

  const setEmail = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, email: value }));
  }, []);

  const setPassword = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, password: value }));
  }, []);

  const validateField = useCallback((field: "email" | "password") => {
    setFormState((prev) => {
      const value = prev[field];
      const validator = field === "email" ? validateEmail : validatePassword;
      const err = validator(value);
      const nextErrors = { ...prev.errors };

      if (err) {
        nextErrors[field] = err;
      } else {
        delete nextErrors[field];
      }

      return { ...prev, errors: nextErrors };
    });
  }, []);

  const validateAll = useCallback((): boolean => {
    let valid = true;

    setFormState((prev) => {
      const nextErrors: Record<string, string> = {};

      const emailErr = validateEmail(prev.email);
      if (emailErr) {
        nextErrors.email = emailErr;
        valid = false;
      }

      const pwErr = validatePassword(prev.password);
      if (pwErr) {
        nextErrors.password = pwErr;
        valid = false;
      }

      return { ...prev, errors: nextErrors };
    });

    return valid;
  }, []);

  const resetForm = useCallback(() => {
    setFormState(initialState);
  }, []);

  return {
    email: formState.email,
    password: formState.password,
    errors: formState.errors,
    setEmail,
    setPassword,
    validateField,
    validateAll,
    resetForm,
  };
}
