"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  generalError: string | null;
  submit: (email: string, password: string) => void;
  clearError: () => void;
}

/**
 * 로그인 API 호출을 담당하는 커스텀 훅 (mutation)
 * - AuthContext의 login 함수를 호출
 * - 성공 시 /dashboard로 리다이렉트
 * - 실패 시 generalError 상태를 설정
 */
const useLogin = (): UseLoginReturn => {
  const { login } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const submit = useCallback(
    (email: string, password: string) => {
      setGeneralError(null);
      const err = login(email, password);
      if (err) {
        setGeneralError(err);
      } else {
        router.push("/dashboard");
      }
    },
    [login, router],
  );

  const clearError = useCallback(() => {
    setGeneralError(null);
  }, []);

  return {
    generalError,
    submit,
    clearError,
  };
};

export default useLogin;
