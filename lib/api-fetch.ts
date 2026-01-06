/**
 * fetch() com:
 * - Authorization: Bearer <accessToken>
 * - credentials: "include" (necessário para refresh cookie HttpOnly no domínio da API)
 * - retry automático: se 401 -> chama refresh() e repete 1 vez
 */
export async function apiFetch(
  url: string,
  options: RequestInit,
  getAccessToken: () => string | null,
  refresh: () => Promise<string | null>
): Promise<Response> {
  const run = async (token: string | null) => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);

    // Se existe body e não foi definido Content-Type, seta JSON por padrão.
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  };

  const first = await run(getAccessToken());
  if (first.status !== 401) return first;

  const newToken = await refresh();
  if (!newToken) return first;

  return run(newToken);
}
