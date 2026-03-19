"use client";

import { useState } from "react";
import { validateEmail, validatePassword, validateName } from "@/lib/validators";

interface SignupFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  errors: Record<string, string>;
}

interface UseSignupFormReturn {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  errors: Record<string, string>;
  handleNameChange: (value: string) => void;
  handleEmailChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleConfirmPasswordChange: (value: string) => void;
  handleNameBlur: () => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
  handleConfirmPasswordBlur: () => void;
  validate: () => Record<string, string>;
}

const useSignupForm = (): UseSignupFormReturn => {
  const [state, setState] = useState<SignupFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    errors: {},
  });

  const handleNameChange = (value: string) => {
    setState((prev) => ({ ...prev, name: value }));
  };

  const handleEmailChange = (value: string) => {
    setState((prev) => ({ ...prev, email: value }));
  };

  const handlePasswordChange = (value: string) => {
    setState((prev) => ({ ...prev, password: value }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setState((prev) => ({ ...prev, confirmPassword: value }));
  };

  const handleNameBlur = () => {
    const err = validateName(state.name);
    setState((prev) => {
      const { name: _name, ...rest } = prev.errors;
      void _name;
      return {
        ...prev,
        errors: err ? { ...prev.errors, name: err } : rest,
      };
    });
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

  const handleConfirmPasswordBlur = () => {
    const err =
      state.password !== state.confirmPassword ? "비밀번호가 일치하지 않습니다" : null;
    setState((prev) => {
      const { confirmPassword: _confirmPassword, ...rest } = prev.errors;
      void _confirmPassword;
      return {
        ...prev,
        errors: err ? { ...prev.errors, confirmPassword: err } : rest,
      };
    });
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const nameErr = validateName(state.name);
    if (nameErr) errs.name = nameErr;
    const emailErr = validateEmail(state.email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(state.password);
    if (pwErr) errs.password = pwErr;
    if (state.password !== state.confirmPassword)
      errs.confirmPassword = "비밀번호가 일치하지 않습니다";
    setState((prev) => ({ ...prev, errors: errs }));
    return errs;
  };

  return {
    name: state.name,
    email: state.email,
    password: state.password,
    confirmPassword: state.confirmPassword,
    errors: state.errors,
    handleNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleNameBlur,
    handleEmailBlur,
    handlePasswordBlur,
    handleConfirmPasswordBlur,
    validate,
  };
};

export default useSignupForm;
