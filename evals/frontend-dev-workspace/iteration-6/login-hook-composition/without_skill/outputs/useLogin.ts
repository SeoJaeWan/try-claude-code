"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export interface UseLoginReturn {
  execute: (email: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

/**
 * 로그인 API 호출을 담당하는 훅
 * - AuthContext의 login 함수를 래핑
 * - 로딩/에러/성공 상태 관리
 * - 성공 시 대시보드로 라우팅
 */
const useLogin = (): UseLoginReturn => {
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const execute = useCallback(
    (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);

      try {
        const err = login(email, password);
        if (err) {
          setError(err);
        } else {
          setIsSuccess(true);
          router.push("/dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [login, router],
  );

  return {
    execute,
    isLoading,
    error,
    isSuccess,
  };
};

export default useLogin;
