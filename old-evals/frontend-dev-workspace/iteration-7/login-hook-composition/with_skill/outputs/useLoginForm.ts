"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface UseLoginFormResult {
  email: string;
  password: string;
  errors: Record<string, string>;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  validateField: (field: "email" | "password") => void;
  validateAll: () => Record<string, string>;
  resetForm: () => void;
}

/**
 * useLoginForm custom hook
 * Manages login form state and field-level / form-level validation
 * @returns form values, errors, setters, and validation helpers
 */
const useLoginForm = (): UseLoginFormResult => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback(
    (field: "email" | "password") => {
      const value = field === "email" ? email : password;
      const validator = field === "email" ? validateEmail : validatePassword;
      const err = validator(value);

      setErrors((prev) => {
        if (err) {
          return { ...prev, [field]: err };
        }
        const next = { ...prev };
        delete next[field];
        return next;
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

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
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
    resetForm,
  };
};

export default useLoginForm;
