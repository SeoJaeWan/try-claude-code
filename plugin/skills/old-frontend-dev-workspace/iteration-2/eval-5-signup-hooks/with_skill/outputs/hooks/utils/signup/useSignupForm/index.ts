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
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validate: () => Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
}

const useSignupForm = (): UseSignupFormReturn => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const nameErr = validateName(name);
    if (nameErr) errs.name = nameErr;
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    if (password !== confirmPassword) errs.confirmPassword = "비밀번호가 일치하지 않습니다";
    return errs;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  return {
    name,
    email,
    password,
    confirmPassword,
    errors,
    handleNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    validate,
    setErrors,
  };
};

export default useSignupForm;
