"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface UsePostLoginReturn {
  generalError: string | null;
  handleSubmit: (email: string, password: string, validate: () => Record<string, string>) => void;
}

const usePostLogin = (): UsePostLoginReturn => {
  const { login } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = (
    email: string,
    password: string,
    validate: () => Record<string, string>
  ) => {
    setGeneralError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) return;

    const err = login(email, password);
    if (err) {
      setGeneralError(err);
    } else {
      router.push("/dashboard");
    }
  };

  return {
    generalError,
    handleSubmit,
  };
};

export default usePostLogin;
