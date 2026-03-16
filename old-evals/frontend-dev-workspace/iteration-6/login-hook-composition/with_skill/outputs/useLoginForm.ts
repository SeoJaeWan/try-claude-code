"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface LoginFormState {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
}

interface UseLoginFormReturn {
  /** Current form field values */
  values: LoginFormState;
  /** Field-level validation errors */
  errors: LoginFormErrors;
  /** Update a single field value */
  setField: (field: keyof LoginFormState, value: string) => void;
  /** Validate a single field (e.g., on blur) */
  validateField: (field: keyof LoginFormState) => void;
  /** Validate all fields and return true if valid */
  validateAll: () => boolean;
  /** Reset form to initial state */
  reset: () => void;
}

const INITIAL_VALUES: LoginFormState = { email: "", password: "" };

/**
 * useLoginForm - Custom hook for login form state and validation
 *
 * Manages email/password field values, per-field validation on blur,
 * and full-form validation before submission.
 */
const useLoginForm = (): UseLoginFormReturn => {
  const [values, setValues] = useState<LoginFormState>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const setField = useCallback((field: keyof LoginFormState, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const validateField = useCallback(
    (field: keyof LoginFormState) => {
      const validator = field === "email" ? validateEmail : validatePassword;
      const error = validator(values[field]);

      setErrors((prev) => {
        if (error) {
          return { ...prev, [field]: error };
        }
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [values],
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: LoginFormErrors = {};
    const emailErr = validateEmail(values.email);
    if (emailErr) newErrors.email = emailErr;
    const pwErr = validatePassword(values.password);
    if (pwErr) newErrors.password = pwErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const reset = useCallback(() => {
    setValues(INITIAL_VALUES);
    setErrors({});
  }, []);

  return { values, errors, setField, validateField, validateAll, reset };
};

export default useLoginForm;
