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

  /** Mensagem de erro relacionada à sessão (ex.: falha ao refresh) */
  authError: string | null;
  clearAuthError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await apiRefresh();
      setAccessToken(res.accessToken);
      // Tenta extrair informação do usuário a partir do payload do JWT quando disponível
      try {
        const parts = res.accessToken.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const maybeUser: AuthUser | null = {
            id: (payload?.sub ?? payload?.id ?? payload?.user_id ?? payload?.isn_usuario ?? payload?.uid ?? "").toString(),
            nome: (payload?.nome ?? payload?.name ?? payload?.Nome ?? undefined) as string | undefined,
            email: (payload?.email ?? payload?.Email ?? undefined) as string | undefined,
            profile: (payload?.profile ?? payload?.Profile ?? undefined) as number | undefined,
          };

          if (maybeUser?.id) setUser(maybeUser);
        }
      } catch {
        // se não conseguir decodificar, não quebra; mantém user como está (pode ser null)
      }
      // endpoint /auth/refresh normalmente não retorna user; mantém o atual.
      setStatus("authenticated");
      setAuthError(null);
      return res.accessToken;
    } catch (err: any) {
      const message = err?.message ?? "Falha ao renovar sessão.";
      setAuthError(message);
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
    setAuthError(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout(accessToken ?? undefined);
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
      setAuthError(null);
    }
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, accessToken, user, signIn, signOut, refreshSession, authError, clearAuthError }),
    [status, accessToken, user, signIn, signOut, refreshSession, authError, clearAuthError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
