import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword, validateName } from "@/lib/validators";

const useSignupForm = () => {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const err = signup(email, password, name);
    if (err) {
      setGeneralError(err);
    } else {
      router.push("/dashboard");
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    errors,
    generalError,
    handleSubmit,
  };
};

export default useSignupForm;
