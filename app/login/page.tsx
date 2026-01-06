"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { signIn } = useAuth();

  const nextUrl = useMemo(() => sp.get("next") || "/", [sp]);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [manterLogado, setManterLogado] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);
    try {
      await signIn(login.trim(), password, manterLogado);
      router.replace(nextUrl);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível realizar o login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(circle at 10% 20%, rgba(255,42,149,0.06) 0%, rgba(243,244,246,1) 35%), radial-gradient(circle at 90% 80%, rgba(59,130,246,0.08) 0%, rgba(243,244,246,1) 45%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white border shadow-sm rounded-2xl p-6">
          <div className="mb-5">
            <h1 className="text-xl font-semibold">Entrar</h1>
            <p className="text-sm text-muted mt-1">
              Acesse sua conta para visualizar seus créditos e chats.
            </p>
          </div>

          {error && (
            <div className="mb-4 text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-muted">Login (e-mail ou usuário)</label>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
                placeholder="seuemail@exemplo.com"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-xs text-muted">Senha</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              
              <Link href="/recuperar" className="text-sm text-brand-blue hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-5 py-2 rounded-2xl text-white text-sm
              bg-gradient-to-r from-brand-pink via-brand-magenta to-brand-blue
              ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {!process.env.NEXT_PUBLIC_API_URL && (
            <div className="mt-5 text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded-xl px-3 py-2">
              Atenção: configure <span className="font-mono">NEXT_PUBLIC_API_URL</span> para apontar para sua API.
            </div>
          )}
        </div>

        <div className="text-xs text-muted text-center mt-4">
          © {new Date().getFullYear()} ClubClincheck
        </div>
      </div>
    </div>
  );
}
