import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiData, getStoredToken, setStoredToken } from "@/lib/api";
import type { AuthPayload, User } from "@/types";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    apiData<{ user: User }>("get", "/auth/me")
      .then((payload) => {
        if (!cancelled) {
          setUser(payload.user);
          setToken(stored);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoredToken(null);
          setUser(null);
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuth = useCallback((payload: AuthPayload) => {
    setStoredToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
    return payload.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = await apiData<AuthPayload>("post", "/auth/login", { email, password });
      return applyAuth(payload);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const payload = await apiData<AuthPayload>("post", "/auth/register", { name, email, password });
      return applyAuth(payload);
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
