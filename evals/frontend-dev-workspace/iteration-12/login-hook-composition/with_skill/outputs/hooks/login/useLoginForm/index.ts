"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface UseLoginFormReturn {
  email: string;
  password: string;
  errors: Record<string, string>;
  handleEmailChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
  validate: () => Record<string, string>;
  resetErrors: () => void;
}

const useLoginForm = (): UseLoginFormReturn => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
  }, []);

  const handleEmailBlur = useCallback(() => {
    const err = validateEmail(email);
    setErrors((prev) =>
      err
        ? { ...prev, email: err }
        : (({ email: _, ...rest }) => rest)(prev)
    );
  }, [email]);

  const handlePasswordBlur = useCallback(() => {
    const err = validatePassword(password);
    setErrors((prev) =>
      err
        ? { ...prev, password: err }
        : (({ password: _, ...rest }) => rest)(prev)
    );
  }, [password]);

  const validate = useCallback(() => {
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
  }, []);

  return {
    email,
    password,
    errors,
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
    validate,
    resetErrors,
  };
};

export default useLoginForm;
