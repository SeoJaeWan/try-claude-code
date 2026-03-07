import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { AuthState, User, LoginRequest } from '../types/auth';
import { authApi } from '../services/authApi';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

function getStoredAuth(): Partial<AuthState> {
  try {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const user = userJson ? JSON.parse(userJson) : null;
    return {
      accessToken,
      user,
      isAuthenticated: !!(accessToken && user),
    };
  } catch {
    return { accessToken: null, user: null, isAuthenticated: false };
  }
}

function storeAuth(accessToken: string, refreshToken: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth();

  const [user, setUser] = useState<User | null>(stored.user || null);
  const [accessToken, setAccessToken] = useState<string | null>(stored.accessToken || null);
  const [isAuthenticated, setIsAuthenticated] = useState(stored.isAuthenticated || false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify stored token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!accessToken) return;

      try {
        const userData = await authApi.getMe(accessToken);
        setUser(userData);
        setIsAuthenticated(true);
      } catch {
        // Token is invalid, try refresh
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          try {
            const response = await authApi.refreshToken(refreshToken);
            setAccessToken(response.accessToken);
            setUser(response.user);
            setIsAuthenticated(true);
            storeAuth(response.accessToken, response.refreshToken, response.user);
          } catch {
            clearStoredAuth();
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          clearStoredAuth();
          setAccessToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    verifyToken();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(credentials);
      setAccessToken(response.accessToken);
      setUser(response.user);
      setIsAuthenticated(true);
      storeAuth(response.accessToken, response.refreshToken, response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch {
      // Proceed with local logout even if server logout fails
    } finally {
      clearStoredAuth();
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  }, [accessToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
