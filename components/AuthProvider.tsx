"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth-client";
import { login as apiLogin, logout as apiLogout, refresh as apiRefresh } from "@/lib/auth-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;

  signIn: (login: string, senha: string, manterLogado?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  /** Tenta renovar a sessão via refresh cookie; retorna o novo accessToken (ou null). */
  refreshSession: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await apiRefresh();
      setAccessToken(res.accessToken);
      // endpoint /auth/refresh normalmente não retorna user; mantém o atual.
      setStatus("authenticated");
      return res.accessToken;
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    // Ao carregar o app, tenta renovar sessão via refresh cookie (cross-domain).
    refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async (login: string, senha: string, manterLogado: boolean = true) => {
    const res = await apiLogin(login, senha, manterLogado);
    setAccessToken(res.accessToken);
    setUser(res.user ?? null);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, accessToken, user, signIn, signOut, refreshSession }),
    [status, accessToken, user, signIn, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
