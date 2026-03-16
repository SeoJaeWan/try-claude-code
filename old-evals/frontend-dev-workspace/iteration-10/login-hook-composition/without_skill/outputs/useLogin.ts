import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  login: (email: string, password: string) => void;
  error: string | null;
  isLoading: boolean;
  clearError: () => void;
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
        const result = authLogin(email, password);

        if (result) {
          setError(result);
        } else {
          router.push("/dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [authLogin, router]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    error,
    isLoading,
    clearError,
  };
}
