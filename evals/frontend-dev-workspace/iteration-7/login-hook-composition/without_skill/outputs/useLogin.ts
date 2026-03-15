"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginResult {
  mutate: (email: string, password: string) => string | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * useLogin API hook (mutation)
 * Wraps AuthContext.login to provide a consistent mutation-style API
 * @returns mutate function, loading state, and error
 */
const useLogin = (): UseLoginResult => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    (email: string, password: string): string | null => {
      setIsLoading(true);
      setError(null);

      const result = login(email, password);

      if (result) {
        setError(result);
      }

      setIsLoading(false);
      return result;
    },
    [login],
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, isLoading, error, reset };
};

export default useLogin;
