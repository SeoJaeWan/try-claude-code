"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  /** Attempt login with email/password. Returns null on success, error string on failure. */
  login: (email: string, password: string) => string | null;
  /** Whether a login attempt is in progress */
  isLoading: boolean;
  /** General error from the last login attempt (e.g. wrong credentials) */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * API hook that wraps AuthContext.login with loading/error state.
 * Separates the "call the API" concern from form UI state.
 */
export function useLogin(): UseLoginReturn {
  const { login: authLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(
    (email: string, password: string): string | null => {
      setIsLoading(true);
      setError(null);

      const result = authLogin(email, password);

      if (result) {
        setError(result);
      }

      setIsLoading(false);
      return result;
    },
    [authLogin],
  );

  return { login, isLoading, error, clearError };
}
