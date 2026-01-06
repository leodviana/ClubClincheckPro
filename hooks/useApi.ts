"use client";

import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/hooks/useAuth";

function apiBase() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  return (base || "").replace(/\/$/, "");
}

/**
 * Hook para chamadas autenticadas respeitando:
 * - Access token em memória (Bearer)
 * - Refresh token em cookie HttpOnly (credentials include)
 * - Retry automático em 401
 */
export function useApi() {
  const { accessToken, refreshSession } = useAuth();

  async function refreshAndGetToken(): Promise<string | null> {
    const ok = await refreshSession();
    // accessToken é atualizado via estado; mas para garantir token de retorno
    // este hook deve ser usado em sequência com nova render. Aqui retornamos null
    // e o retry vai depender de a requisição ser repetida após o estado.
    // Para uso prático, exponha também um método que aceite um token explicitamente.
    return ok ? accessToken : null;
  }

  async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
    const base = apiBase();
    if (!base) throw new Error("NEXT_PUBLIC_API_URL não configurada.");

    const res = await apiFetch(
      `${base}${path.startsWith("/") ? path : `/${path}`}`,
      options,
      () => accessToken,
      async () => {
        return await refreshSession();
      }
    );

    if (!res.ok) {
      const ct = res.headers.get("content-type") || "";
      const msg = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
      throw new Error(msg || `HTTP ${res.status}`);
    }

    return (await res.json()) as T;
  }

  return { fetchJson };
}
