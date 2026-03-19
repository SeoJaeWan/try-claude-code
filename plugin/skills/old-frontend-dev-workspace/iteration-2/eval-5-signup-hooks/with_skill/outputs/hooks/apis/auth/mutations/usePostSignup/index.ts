import { useAuth } from "@/contexts/AuthContext";

interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

interface UsePostSignupReturn {
  postSignup: (payload: SignupPayload) => string | null;
}

const usePostSignup = (): UsePostSignupReturn => {
  const { signup } = useAuth();

  const postSignup = (payload: SignupPayload): string | null => {
    return signup(payload.email, payload.password, payload.name);
  };

  return { postSignup };
};

export default usePostSignup;
