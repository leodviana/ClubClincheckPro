"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setOkMessage(null);
    setLoading(true);

    try {
      const res = await requestPasswordReset(email.trim());
      setOkMessage(res.message);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível processar a solicitação.");
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
            <h1 className="text-xl font-semibold">Recuperar senha</h1>
            <p className="text-sm text-muted mt-1">
              Informe seu e-mail para receber instruções.
            </p>
          </div>

          {error && (
            <div className="mb-4 text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
              {error}
            </div>
          )}

          {okMessage && (
            <div className="mb-4 text-sm rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2">
              {okMessage}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-muted">E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-5 py-2 rounded-2xl text-white text-sm
              bg-gradient-to-r from-brand-pink via-brand-magenta to-brand-blue
              ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="/login" className="text-brand-blue hover:underline">
              Voltar para login
            </Link>
            <Link href="/" className="text-muted hover:underline">
              Início
            </Link>
          </div>
        </div>

        <div className="text-xs text-muted text-center mt-4">
          © {new Date().getFullYear()} ClubClincheck
        </div>
      </div>
    </div>
  );
}
