"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface UseLoginReturn {
  submit: (email: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
  resetError: () => void;
}

/**
 * useLogin - API mutation hook for user login
 * Calls AuthContext.login and handles navigation on success
 */
const useLogin = (): UseLoginReturn => {
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      const err = login(email, password);

      if (err) {
        setError(err);
        setIsLoading(false);
      } else {
        router.push("/dashboard");
      }
    },
    [login, router],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submit,
    isLoading,
    error,
    resetError,
  };
};

export default useLogin;
