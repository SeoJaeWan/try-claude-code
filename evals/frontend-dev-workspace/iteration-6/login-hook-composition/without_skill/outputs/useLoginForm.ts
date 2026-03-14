"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

export interface LoginFormState {
  email: string;
  password: string;
  errors: Record<string, string>;
}

export interface UseLoginFormReturn {
  email: string;
  password: string;
  errors: Record<string, string>;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  validateField: (field: "email" | "password") => void;
  validateAll: () => boolean;
  reset: () => void;
}

/**
 * 로그인 폼의 상태와 유효성 검사를 관리하는 커스텀 훅
 * - email, password 상태 관리
 * - 필드별/전체 유효성 검사
 * - 폼 초기화
 */
const useLoginForm = (): UseLoginFormReturn => {
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

  const reset = useCallback(() => {
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
    reset,
  };
};

export default useLoginForm;
