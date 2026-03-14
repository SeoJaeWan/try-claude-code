"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  generalError: string | null;
  isLoading: boolean;
  execute: (email: string, password: string) => void;
  clearError: () => void;
}

export function useLogin(): UseLoginReturn {
  const { login } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    (email: string, password: string) => {
      setGeneralError(null);
      setIsLoading(true);

      try {
        const err = login(email, password);
        if (err) {
          setGeneralError(err);
        } else {
          router.push("/dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [login, router]
  );

  const clearError = useCallback(() => {
    setGeneralError(null);
  }, []);

  return {
    generalError,
    isLoading,
    execute,
    clearError,
  };
}
