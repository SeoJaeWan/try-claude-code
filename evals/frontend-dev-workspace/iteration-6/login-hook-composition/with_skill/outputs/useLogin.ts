"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  /** Execute the login mutation */
  mutate: (email: string, password: string) => string | null;
  /** Whether a login request is currently in progress */
  isLoading: boolean;
  /** General error message from the last login attempt */
  error: string | null;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * useLogin - API mutation hook for user login
 *
 * Wraps AuthContext.login with loading/error state management.
 * Returns a mutate function that attempts login and returns
 * null on success or an error string on failure.
 */
const useLogin = (): UseLoginReturn => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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

  return { mutate, isLoading, error, clearError };
};

export default useLogin;
