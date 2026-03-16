"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginParams {
  email: string;
  password: string;
}

interface UseLoginOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseLoginResult {
  mutate: (params: UseLoginParams) => void;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * 로그인 API 훅 (mutation)
 * AuthContext의 login을 래핑하여 mutation 패턴으로 제공
 * @param options - onSuccess/onError 콜백
 * @returns mutate 함수, 로딩/에러/성공 상태
 */
const useLogin = (options: UseLoginOptions = {}): UseLoginResult => {
  const { onSuccess, onError } = options;
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    (params: UseLoginParams) => {
      setIsLoading(true);
      setIsError(false);
      setIsSuccess(false);
      setError(null);

      const result = login(params.email, params.password);

      setIsLoading(false);

      if (result) {
        setIsError(true);
        setError(result);
        onError?.(result);
      } else {
        setIsSuccess(true);
        onSuccess?.();
      }
    },
    [login, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsError(false);
    setIsSuccess(false);
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    isError,
    isSuccess,
    error,
    reset,
  };
};

export default useLogin;
