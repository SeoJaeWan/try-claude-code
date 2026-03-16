"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { validateEmail, validatePassword, validateName } from "@/lib/validators";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  mounted: boolean;
  login: (email: string, password: string) => string | null;
  signup: (email: string, password: string, name: string) => string | null;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const checkSession = useCallback(() => {
    const loginAt = localStorage.getItem("auth_login_at");
    if (loginAt && Date.now() - Number(loginAt) > SESSION_TIMEOUT) {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_login_at");
      setUser(null);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("auth_user");
    if (savedUser) {
      if (checkSession()) {
        setUser(JSON.parse(savedUser));
      }
    }
    setMounted(true);
  }, [checkSession]);

  const getUsers = (): Array<{ email: string; password: string; user: User }> => {
    const raw = localStorage.getItem("auth_users");
    return raw ? JSON.parse(raw) : [];
  };

  const saveUsers = (users: Array<{ email: string; password: string; user: User }>) => {
    localStorage.setItem("auth_users", JSON.stringify(users));
  };

  const login = (email: string, password: string): string | null => {
    const emailErr = validateEmail(email);
    if (emailErr) return emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) return pwErr;

    const users = getUsers();
    const found = users.find((u) => u.email === email);
    if (!found) return "등록되지 않은 이메일입니다";
    if (found.password !== password) return "비밀번호가 일치하지 않습니다";

    setUser(found.user);
    localStorage.setItem("auth_user", JSON.stringify(found.user));
    localStorage.setItem("auth_login_at", String(Date.now()));
    return null;
  };

  const signup = (email: string, password: string, name: string): string | null => {
    const nameErr = validateName(name);
    if (nameErr) return nameErr;
    const emailErr = validateEmail(email);
    if (emailErr) return emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) return pwErr;

    const users = getUsers();
    if (users.find((u) => u.email === email)) return "이미 등록된 이메일입니다";

    const newUser: User = { id: crypto.randomUUID(), email, name };
    users.push({ email, password, user: newUser });
    saveUsers(users);

    setUser(newUser);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    localStorage.setItem("auth_login_at", String(Date.now()));
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_login_at");
    router.push("/login");
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("auth_user", JSON.stringify(updated));

    const users = getUsers();
    const idx = users.findIndex((u) => u.email === user.email);
    if (idx !== -1) {
      users[idx].user = updated;
      saveUsers(users);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, mounted, login, signup, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
