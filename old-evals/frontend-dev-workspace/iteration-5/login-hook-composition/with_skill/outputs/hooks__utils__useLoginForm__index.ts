"use client";

import { useState, useCallback } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface LoginFormState {
  email: string;
  password: string;
  errors: Record<string, string>;
}

/**
 * useLoginForm - 로그인 폼 상태 관리 훅
 * @returns 폼 상태, 변경 핸들러, 검증 함수
 */
const useLoginForm = () => {
  const [form, setForm] = useState<LoginFormState>({
    email: "",
    password: "",
    errors: {},
  });

  const handleChange = useCallback((field: "email" | "password", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleBlur = useCallback((field: "email" | "password") => {
    const value = field === "email" ? form.email : form.password;
    const validator = field === "email" ? validateEmail : validatePassword;
    const err = validator(value);

    setForm((prev) => {
      const newErrors = { ...prev.errors };
      if (err) {
        newErrors[field] = err;
      } else {
        delete newErrors[field];
      }
      return { ...prev, errors: newErrors };
    });
  }, [form.email, form.password]);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(form.password);
    if (pwErr) errs.password = pwErr;
    return errs;
  }, [form.email, form.password]);

  const setErrors = useCallback((errors: Record<string, string>) => {
    setForm((prev) => ({ ...prev, errors }));
  }, []);

  return {
    form,
    handleChange,
    handleBlur,
    validate,
    setErrors,
  };
};

export default useLoginForm;
