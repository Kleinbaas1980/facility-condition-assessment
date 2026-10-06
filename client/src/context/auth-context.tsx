"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "@/api/auth";

import { ApiError, clearCsrf, refreshSession } from "@/api/http";
import type { User } from "@/types/project";
export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [expiry, setExpiry] = useState(0);
  const reload = useCallback(async () => {
    setError(null);
    try {
      setUser(await authApi.me());
    } catch (error) {
      setUser(null);
      if (!(error instanceof ApiError && error.status === 401))
        setError(
          error instanceof Error
            ? error.message
            : "Could not load your account.",
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    const expired = () => {
      setUser(null);
      setExpiry(0);
      clearCsrf();
    };
    const received = (event: Event) => {
      setExpiry((event as CustomEvent<number>).detail);
      setError(null);
    };
    window.addEventListener("fca:unauthenticated", expired);
    window.addEventListener("fca:token-expiry", received);
    return () => {
      window.removeEventListener("fca:unauthenticated", expired);
      window.removeEventListener("fca:token-expiry", received);
    };
  }, [reload]);
  useEffect(() => {
    if (!user || !expiry) return;
    const timer = setTimeout(
      () => {
        void refreshSession().catch((error) => {
          if (error instanceof ApiError && error.status === 401) {
            setUser(null);
            setExpiry(0);
          } else {
            setError("Session connection interrupted. Retrying…");
            setExpiry(Date.now() + 60000);
          }
        });
      },
      Math.max(1000, expiry - Date.now() - 30000),
    );
    return () => clearTimeout(timer);
  }, [user, expiry]);
  const login = useCallback(async (email: string, password: string) => {
    setUser(await authApi.login(email, password));
    setError(null);
  }, []);
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
      setExpiry(0);
      clearCsrf();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not log out.");
    }
  }, []);
  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, logout, reload }}
    >
      {error && (
        <div className="auth-message" role="alert">
          {error}
          <button onClick={() => void reload()}>Retry connection</button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
