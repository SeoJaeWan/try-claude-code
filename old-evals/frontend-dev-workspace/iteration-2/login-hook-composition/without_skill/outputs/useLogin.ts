"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  /** Call the login API with email and password. Returns error string or null on success. */
  mutate: (email: string, password: string) => string | null;
  /** General error from the last login attempt (e.g. wrong credentials). */
  error: string | null;
  /** Clear the current error. */
  clearError: () => void;
}

/**
 * API hook that encapsulates the login mutation logic.
 * Delegates to AuthContext.login and handles navigation on success.
 */
export function useLogin(): UseLoginReturn {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const mutate = useCallback(
    (email: string, password: string): string | null => {
      setError(null);
      const err = login(email, password);
      if (err) {
        setError(err);
        return err;
      }
      router.push("/dashboard");
      return null;
    },
    [login, router],
  );

  return { mutate, error, clearError };
}
