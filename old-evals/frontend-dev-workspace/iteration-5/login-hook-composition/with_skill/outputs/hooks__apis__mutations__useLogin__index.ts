"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * useLogin - 로그인 API 훅 (mutation)
 * useAuth의 login을 래핑하여 로딩/에러 상태를 관리한다
 * @returns login 실행 함수, 로딩 상태, 에러 상태
 */
const useLogin = () => {
  const { login: authLogin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    (email: string, password: string): boolean => {
      setIsLoading(true);
      setError(null);

      const err = authLogin(email, password);

      if (err) {
        setError(err);
        setIsLoading(false);
        return false;
      }

      setIsLoading(false);
      router.push("/dashboard");
      return true;
    },
    [authLogin, router],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    isLoading,
    error,
    resetError,
  };
};

export default useLogin;
