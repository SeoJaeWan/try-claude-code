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

/**
 * 로그인 폼 상태 관리 및 유효성 검사를 담당하는 커스텀 훅
 * - 이메일/비밀번호 입력 상태 관리
 * - 필드별 블러 시 유효성 검사
 * - 전체 폼 유효성 검사
 */
const useLoginForm = (): UseLoginFormReturn => {
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
      const err = validator(value);

      if (err) {
        return { ...prev, errors: { ...prev.errors, [field]: err } };
      }

      const { [field]: _, ...restErrors } = prev.errors;
      return { ...prev, errors: restErrors };
    });
  }, []);

  const validateAll = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(formState.email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(formState.password);
    if (pwErr) errs.password = pwErr;

    setFormState((prev) => ({ ...prev, errors: errs }));
    return Object.keys(errs).length === 0;
  }, [formState.email, formState.password]);

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
};

export default useLoginForm;
