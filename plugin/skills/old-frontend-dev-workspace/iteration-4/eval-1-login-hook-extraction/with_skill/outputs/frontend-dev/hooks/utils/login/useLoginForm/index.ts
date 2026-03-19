"use client";

import { useState } from "react";
import { validateEmail, validatePassword } from "@/lib/validators";

interface LoginFormState {
  email: string;
  password: string;
  errors: Record<string, string>;
}

interface UseLoginFormReturn {
  email: string;
  password: string;
  errors: Record<string, string>;
  handleEmailChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
  validate: () => Record<string, string>;
}

const useLoginForm = (): UseLoginFormReturn => {
  const [state, setState] = useState<LoginFormState>({
    email: "",
    password: "",
    errors: {},
  });

  const handleEmailChange = (value: string) => {
    setState((prev) => ({ ...prev, email: value }));
  };

  const handlePasswordChange = (value: string) => {
    setState((prev) => ({ ...prev, password: value }));
  };

  const handleEmailBlur = () => {
    const err = validateEmail(state.email);
    setState((prev) => {
      const { email: _email, ...rest } = prev.errors;
      void _email;
      return {
        ...prev,
        errors: err ? { ...prev.errors, email: err } : rest,
      };
    });
  };

  const handlePasswordBlur = () => {
    const err = validatePassword(state.password);
    setState((prev) => {
      const { password: _password, ...rest } = prev.errors;
      void _password;
      return {
        ...prev,
        errors: err ? { ...prev.errors, password: err } : rest,
      };
    });
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const emailErr = validateEmail(state.email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(state.password);
    if (pwErr) errs.password = pwErr;
    setState((prev) => ({ ...prev, errors: errs }));
    return errs;
  };

  return {
    email: state.email,
    password: state.password,
    errors: state.errors,
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
    validate,
  };
};

export default useLoginForm;
