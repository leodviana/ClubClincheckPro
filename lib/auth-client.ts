export type AuthUser = { id: string; nome?: string; email?: string; profile?: number };

export type LoginResponse = {
  accessToken: string;
  accessTokenExpiration?: string | Date;
  user?: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  accessTokenExpiration?: string | Date;
};

export type ForgotPasswordResponse = { ok: true; message: string };

function apiBase() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return "";
  return base.replace(/\/$/, "");
}

async function readError(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const data = await res.json();
      return (data?.error || data?.message || JSON.stringify(data)).toString();
    }
    const text = await res.text();
    return text || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}


function normalizeFetchError(err: unknown): Error {
  if (err instanceof TypeError) {
    return new Error(
      "Não foi possível conectar ao servidor. Verifique sua conexão, a URL da API e as regras de CORS/HTTPS."
    );
  }

  if (err instanceof Error) {
    // Se vier mensagem muito técnica/longa, troca por genérica
    if ((err.message || "").length > 200) {
      return new Error("Ocorreu uma falha ao comunicar com o servidor.");
    }
    return err;
  }

  return new Error("Erro inesperado ao comunicar com o servidor.");
}



function normalizeAccessToken(payload: any): string {
  // Aceita variações de casing
  return (payload?.accessToken ?? payload?.AccessToken ?? payload?.acessToken ?? payload?.AcessToken ?? "").toString();
}

function normalizeAccessTokenExpiration(payload: any): string | undefined {
  return (
    payload?.accessTokenExpiration ??
    payload?.AccessTokenExpiration ??
    payload?.acessTokenExpiration ??
    payload?.AcessTokenExpiration
  ) as string | undefined;
}

function normalizeUser(payload: any): AuthUser | undefined {
  const u = payload?.user ?? payload?.User;
  if (!u) return undefined;

  return {
    id: (u.id ?? u.Id ?? u.isn_usuario ?? u.isnUsuario ?? "").toString(),
    nome: (u.nome ?? u.Nome ?? u.name ?? u.Name ?? undefined) as string | undefined,
    email: (u.email ?? u.Email ?? undefined) as string | undefined,
    profile: (u.profile ?? u.Profile ?? undefined) as number | undefined,
  };
}

/**
 * POST /auth/login
 * - Body: { login, senha, manterLogado }
 * - Response: { accessToken, accessTokenExpiration, user }
 * - Server must set refresh cookie (HttpOnly; Secure; SameSite=None) for cross-domain.
 */
export async function login(
  loginValue: string,
  senha: string,
  manterLogado: boolean
): Promise<LoginResponse> {
  try {
    const base = apiBase();
    if (!base) {
      throw new Error("NEXT_PUBLIC_API_URL não configurada.");
    }

    // 🔒 Endpoint único e explícito
    const url = `${base}/api/Login/login`;

    const body = {
      Login: loginValue,
      senha,
      manter_logado: manterLogado,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    
    if (!res.ok) {
      // Endpoint errado / rota inexistente
      if (res.status === 404 || res.status === 405) {
       throw new Error("Problema na conexão com o servidor.");
      }

      const message = await readError(res);
      throw new Error(message || "Falha ao realizar login.");
    }


    const data = await res.json();

    const accessToken = normalizeAccessToken(data);
    if (!accessToken) {
      throw new Error("Resposta inválida do servidor.");
    }

    return {
      accessToken,
      accessTokenExpiration: normalizeAccessTokenExpiration(data),
      user: normalizeUser(data),
    };

  } catch (err) {
    // ✅ AQUI entra o tratamento de:
    // - Failed to fetch
    // - CORS
    // - API offline
    // - HTTPS inválido
    throw normalizeFetchError(err);
  }
}



/**
 * POST /auth/refresh
 * - Uses refresh cookie automatically (credentials: include)
 * - Response: { accessToken, accessTokenExpiration }
 */
export async function refresh(): Promise<RefreshResponse> {
  try {
      const base = apiBase();
      if (!base) throw new Error("API_URL não configurada.");
        
      const res = await fetch(`${base}/api/Login/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      // Dev-time debug para inspecionar corpo e status (ajuda a detectar CORS/cookie)
      if (process.env.NODE_ENV === "development") {
        try {
          const clone = res.clone();
          clone.text().then(text => console.debug("[auth-client] refresh res", res.status, text)).catch(() => console.debug("[auth-client] refresh res", res.status));
        } catch {}
      }

      if (!res.ok) {
        if (res.status === 401) {
          const msg = await readError(res);
          throw new Error(`Refresh falhou (401). Possível refresh cookie ausente/expirado ou CORS impedindo envio do cookie. ${msg}`);
        }
        throw new Error(await readError(res));
      }

      const data = await res.json();
      const accessToken = normalizeAccessToken(data);
      if (!accessToken) throw new Error("Resposta de refresh sem accessToken.");

      if (process.env.NODE_ENV === "development") {
        console.debug("[auth-client] refresh success, accessToken present");
      }

      return {
        accessToken,
        accessTokenExpiration: normalizeAccessTokenExpiration(data),
      };
  } catch (err) {
    throw normalizeFetchError(err);
  }
}

/**
 * POST /auth/logout
 * - Server should clear refresh cookie.
 */
export async function logout(token?: string): Promise<void> {
  try {
      const base = apiBase();
      if (!base) return;

      // Mesmo se falhar, o front pode limpar estado em memória.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        const res = await fetch(`${base}/api/Login/logout`, {
          method: "POST",
          headers,
          credentials: "include",
        });

        if (process.env.NODE_ENV === "development") {
          try {
            const clone = res.clone();
            clone.text().then(text => console.debug("[auth-client] logout res", res.status, text)).catch(() => console.debug("[auth-client] logout res", res.status));
          } catch {}
        }
      } catch {
        // Ignorar falhas de rede no logout; front limpa estado em memória.
      }
  } catch (err) {
    throw normalizeFetchError(err);
  }
}

/**
 * POST /auth/forgot-password
 * - Body: { email }
 */
export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  try {
      const base = apiBase();

      if (!base) throw new Error("NEXT_PUBLIC_API_URL não configurada.");

      const res = await fetch(`${base}/api/Login/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error(await readError(res));

      return (await res.json()) as ForgotPasswordResponse;
  } catch (err) {
    throw normalizeFetchError(err);
  }
}
