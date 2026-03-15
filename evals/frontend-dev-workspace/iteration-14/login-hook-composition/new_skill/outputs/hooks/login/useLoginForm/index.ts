"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface UseLoginFormResult {
  email: string;
  password: string;
  errors: Record<string, string>;
  handleEmailChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
  validate: () => boolean;
  resetForm: () => void;
}

/**
 * 로그인 폼 상태 관리 커스텀 훅
 * 이메일/비밀번호 입력, 유효성 검사, 에러 상태를 관리
 * @returns 폼 상태 및 핸들러 함수들
 */
const useLoginForm = (): UseLoginFormResult => {
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
    setErrors((prev) => {
      if (err) {
        return { ...prev, email: err };
      }
      const { email: _, ...rest } = prev;
      return rest;
    });
  }, [email]);

  const handlePasswordBlur = useCallback(() => {
    const err = validatePassword(password);
    setErrors((prev) => {
      if (err) {
        return { ...prev, password: err };
      }
      const { password: _, ...rest } = prev;
      return rest;
    });
  }, [password]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) newErrors.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) newErrors.password = pwErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
    validate,
    resetForm,
  };
};

export default useLoginForm;
