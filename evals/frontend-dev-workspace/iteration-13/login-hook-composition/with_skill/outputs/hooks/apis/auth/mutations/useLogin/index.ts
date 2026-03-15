"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UseLoginReturn {
  generalError: string | null;
  handleLogin: (email: string, password: string) => void;
  resetError: () => void;
}

const useLogin = (): UseLoginReturn => {
  const { login } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleLogin = useCallback(
    (email: string, password: string) => {
      setGeneralError(null);
      const err = login(email, password);
      if (err) {
        setGeneralError(err);
      } else {
        router.push("/dashboard");
      }
    },
    [login, router]
  );

  const resetError = useCallback(() => {
    setGeneralError(null);
  }, []);

  return {
    generalError,
    handleLogin,
    resetError,
  };
};

export default useLogin;
