"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword } from "@/lib/validators";

const useLoginForm = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const err = login(email, password);
    if (err) {
      setGeneralError(err);
    } else {
      router.push("/dashboard");
    }
  };

  const handleEmailBlur = () => {
    const err = validateEmail(email);
    setErrors((prev) =>
      err ? { ...prev, email: err } : (({ email: _, ...rest }) => rest)(prev)
    );
  };

  const handlePasswordBlur = () => {
    const err = validatePassword(password);
    setErrors((prev) =>
      err
        ? { ...prev, password: err }
        : (({ password: _, ...rest }) => rest)(prev)
    );
  };

  return {
    email,
    password,
    errors,
    generalError,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onEmailBlur: handleEmailBlur,
    onPasswordBlur: handlePasswordBlur,
    onSubmit: handleSubmit,
  };
};

export default useLoginForm;
