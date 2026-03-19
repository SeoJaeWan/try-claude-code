"use client";

import { useState } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

/** useLoginForm 반환 타입 */
interface UseLoginFormReturn {
  email: string;
  password: string;
  errors: Record<string, string>;
  generalError: string | null;
  handleEmailChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
  handleSubmit: (e: React.FormEvent) => void;
}

/**
 * 로그인 폼 상태와 제출 로직을 관리하는 훅
 * @returns 폼 상태, 에러, 핸들러 함수들
 */
const useLoginForm = (): UseLoginFormReturn => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleEmailChange = (value: string) => {
    setEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const handleEmailBlur = () => {
    const err = validateEmail(email);
    setErrors((prev) =>
      err ? { ...prev, email: err } : (({ email: _, ...rest }) => rest)(prev)
    );
  };

  const handlePasswordBlur = () => {
    const err = validatePassword(password);
    setErrors((prev) =>
      err
        ? { ...prev, password: err }
        : (({ password: _, ...rest }) => rest)(prev)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    // TODO: 로그인 API 호출
  };

  return {
    email,
    password,
    errors,
    generalError,
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
    handleSubmit,
  };
};

export default useLoginForm;
