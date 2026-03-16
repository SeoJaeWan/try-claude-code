"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface UseLoginReturn {
  generalError: string | null;
  submit: (email: string, password: string) => void;
  clearError: () => void;
}

export function useLogin(): UseLoginReturn {
  const { login } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setGeneralError(null);
  }, []);

  const submit = useCallback(
    (email: string, password: string) => {
      setGeneralError(null);
      const err = login(email, password);
      if (err) {
        setGeneralError(err);
      } else {
        router.push("/dashboard");
      }
    },
    [login, router],
  );

  return {
    generalError,
    submit,
    clearError,
  };
}
