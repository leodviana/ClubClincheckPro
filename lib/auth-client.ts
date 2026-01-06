import { Console } from "console";

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
export async function login(loginValue: string, senha: string, manterLogado: boolean): Promise<LoginResponse> {
  const base = apiBase();

  
  if (!base) throw new Error("NEXT_PUBLIC_API_URL não configurada.");

  // Compatibilidade: padrão REST (/auth/login) e endpoint legado (/getLogin)
  const candidates = [`${base}/Login/login`, `${base}/getLogin`];

  // Seu backend atual espera: { Login, senha, manter_logado }
  const body = { Login: loginValue, senha, manter_logado: manterLogado };

  let lastError = "";
  let res: Response | null = null;

  for (const url of candidates) {
    console.log(url);
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    // Se o endpoint não existir, tenta o próximo.
    if (res.status === 404) continue;

    if (!res.ok) {
      lastError = await readError(res);
      // Para 400/401, não faz sentido tentar outro endpoint.
      break;
    }

    break;
  }

  if (!res) throw new Error("Falha ao conectar com o backend.");
  if (!res.ok) throw new Error(lastError || (await readError(res)));

  const data = await res.json();
  const accessToken = normalizeAccessToken(data);
  if (!accessToken) throw new Error("Resposta de login sem accessToken.");

  return {
    accessToken,
    accessTokenExpiration: normalizeAccessTokenExpiration(data),
    user: normalizeUser(data),
  };
}

/**
 * POST /auth/refresh
 * - Uses refresh cookie automatically (credentials: include)
 * - Response: { accessToken, accessTokenExpiration }
 */
export async function refresh(): Promise<RefreshResponse> {
  const base = apiBase();
  if (!base) throw new Error("API_URL não configurada.");

  const res = await fetch(`${base}/Login/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) throw new Error(await readError(res));

  const data = await res.json();
  const accessToken = normalizeAccessToken(data);
  if (!accessToken) throw new Error("Resposta de refresh sem accessToken.");

  return {
    accessToken,
    accessTokenExpiration: normalizeAccessTokenExpiration(data),
  };
}

/**
 * POST /auth/logout
 * - Server should clear refresh cookie.
 */
export async function logout(): Promise<void> {
  const base = apiBase();
  if (!base) return;

  // Mesmo se falhar, o front pode limpar estado em memória.
  await fetch(`${base}/Login/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  }).catch(() => undefined);
}

/**
 * POST /auth/forgot-password
 * - Body: { email }
 */
export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  const base = apiBase();

  if (!base) throw new Error("NEXT_PUBLIC_API_URL não configurada.");

  const res = await fetch(`${base}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  if (!res.ok) throw new Error(await readError(res));

  return (await res.json()) as ForgotPasswordResponse;
}
