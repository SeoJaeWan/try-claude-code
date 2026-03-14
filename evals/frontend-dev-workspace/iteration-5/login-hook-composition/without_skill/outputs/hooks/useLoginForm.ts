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
      const validator = field === "email" ? validateEmail : validatePassword;
      const value = field === "email" ? prev.email : prev.password;
      const error = validator(value);

      const newErrors = { ...prev.errors };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }

      return { ...prev, errors: newErrors };
    });
  }, []);

  const validateAll = useCallback((): boolean => {
    let isValid = true;

    setFormState((prev) => {
      const newErrors: Record<string, string> = {};
      const emailErr = validateEmail(prev.email);
      if (emailErr) {
        newErrors.email = emailErr;
        isValid = false;
      }
      const pwErr = validatePassword(prev.password);
      if (pwErr) {
        newErrors.password = pwErr;
        isValid = false;
      }
      return { ...prev, errors: newErrors };
    });

    return isValid;
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
