"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword, validateName } from "@/lib/validators";

interface SignupFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface UseSignupFormReturn {
  fields: SignupFormState;
  errors: Record<string, string>;
  generalError: string | null;
  handleChange: (field: keyof SignupFormState) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: keyof SignupFormState) => () => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const validateField = (field: keyof SignupFormState, value: string, fields: SignupFormState): string | null => {
  if (field === "name") return validateName(value);
  if (field === "email") return validateEmail(value);
  if (field === "password") return validatePassword(value);
  if (field === "confirmPassword") return value !== fields.password ? "비밀번호가 일치하지 않습니다" : null;
  return null;
};

const useSignupForm = (): UseSignupFormReturn => {
  const { signup } = useAuth();
  const router = useRouter();

  const [fields, setFields] = useState<SignupFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const nameErr = validateName(fields.name);
    if (nameErr) errs.name = nameErr;
    const emailErr = validateEmail(fields.email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(fields.password);
    if (pwErr) errs.password = pwErr;
    if (fields.password !== fields.confirmPassword) errs.confirmPassword = "비밀번호가 일치하지 않습니다";
    return errs;
  };

  const handleChange = (field: keyof SignupFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleBlur = (field: keyof SignupFormState) => () => {
    const err = validateField(field, fields[field], fields);
    setErrors((prev) =>
      err ? { ...prev, [field]: err } : (({ [field]: _, ...rest }) => rest)(prev as Record<string, string>)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const err = signup(fields.email, fields.password, fields.name);
    if (err) {
      setGeneralError(err);
    } else {
      router.push("/dashboard");
    }
  };

  return { fields, errors, generalError, handleChange, handleBlur, handleSubmit };
};

export default useSignupForm;
