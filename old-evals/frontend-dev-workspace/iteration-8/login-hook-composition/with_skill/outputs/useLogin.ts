"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface UseLoginReturn {
  login: (email: string, password: string) => void;
  error: string | null;
  isLoading: boolean;
}

export function useLogin(): UseLoginReturn {
  const { login: authLogin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    (email: string, password: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const err = authLogin(email, password);
        if (err) {
          setError(err);
        } else {
          router.push("/dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [authLogin, router],
  );

  return { login, error, isLoading };
}
