"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  login: (email: string, password: string) => string | null;
  isLoading: boolean;
}

export function useLogin(): UseLoginReturn {
  const { login: authLogin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    (email: string, password: string): string | null => {
      setIsLoading(true);
      try {
        const err = authLogin(email, password);
        if (!err) {
          router.push("/dashboard");
        }
        return err;
      } finally {
        setIsLoading(false);
      }
    },
    [authLogin, router],
  );

  return { login, isLoading };
}
