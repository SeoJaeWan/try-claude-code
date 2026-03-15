"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface UseLoginFormReturn {
  email: string;
  password: string;
  errors: Record<string, string>;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  validateAll: () => Record<string, string>;
  validateField: (field: "email" | "password") => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  resetForm: () => void;
}

/**
 * 로그인 폼의 상태 관리와 유효성 검증을 담당하는 커스텀 훅
 * - 이메일/비밀번호 입력 상태
 * - 필드별 유효성 검증 (onBlur)
 * - 전체 폼 유효성 검증 (onSubmit)
 */
const useLoginForm = (): UseLoginFormReturn => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateAll = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    return errs;
  }, [email, password]);

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
    validateAll,
    validateField,
    setErrors,
    resetForm,
  };
};

export default useLoginForm;
