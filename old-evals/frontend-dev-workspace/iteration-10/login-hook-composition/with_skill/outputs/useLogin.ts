"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export interface UseLoginReturn {
  /** General error message from the login attempt (e.g., wrong password) */
  error: string | null;
  /** Whether a login attempt is in progress */
  isLoading: boolean;
  /** Execute login with the given credentials. Returns true on success. */
  execute: (email: string, password: string) => boolean;
  /** Clear the current error state */
  clearError: () => void;
}

export function useLogin(): UseLoginReturn {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    (email: string, password: string): boolean => {
      setIsLoading(true);
      setError(null);

      try {
        const loginError = login(email, password);

        if (loginError) {
          setError(loginError);
          return false;
        }

        router.push("/dashboard");
        return true;
      } finally {
        setIsLoading(false);
      }
    },
    [login, router],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    execute,
    clearError,
  };
}
