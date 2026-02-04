"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { useEffect, useState } from "react";
import { normalizeCredits, normalizeStatus, formatDate, type Credit } from "@/lib/utils/credits-adapter";

export default function UserCredits() {
  const { user, isAuthenticated, accessToken } = useAuth();
  const { fetchJson } = useApi();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Tenta obter id do `user` em memória; se não existir, tenta decodificar o accessToken (JWT)
    const tokenId = (() => {
      if (user?.id) return user.id;
      if (!accessToken) return null;
      try {
        const parts = accessToken.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return (
          payload?.sub ?? payload?.id ?? payload?.user_id ?? payload?.isn_usuario ?? payload?.uid ?? null
        )?.toString() ?? null;
      } catch {
        return null;
      }
    })();

    setCredits([]);

    if (!tokenId) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      setCredits([]);
      try {
        const path = `/api/chats/by-user/${tokenId}`;
        const data = await fetchJson<any>(path);

        if (!mounted) return;

        const list = normalizeCredits(data);
        setCredits(list);
      } catch (err: any) {
        setError(err?.message ?? "Erro ao carregar créditos");
        setCredits([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id, accessToken, isAuthenticated]);

  if (!isAuthenticated) return null;
  if (user?.profile === 1) return null;

  return (
    <div>
      {loading && <p className="text-sm text-muted mb-4">Carregando créditos...</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {credits.map((c, idx) => {
          const st = normalizeStatus(c.status);
          return (
            <Link
              key={c.id}
              href={{ pathname: `/chat/${c.id}` }}
              onClick={() => {
                try {
                  const meta = { chatNo: String(idx + 1), statusKey: st.key, statusLabel: st.label, expiresAt: Date.now() + 60000 };
                  sessionStorage.setItem(`chat.meta.${c.id}`, JSON.stringify(meta));
                } catch (e) {
                  // ignore sessionStorage errors
                }
              }}
            >
              <Card className={`p-6 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md ${c.remaining && c.remaining > 0 ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/logosemnome.png"
                      alt={c.title ?? c.id}
                      width={40}
                      height={40}
                      className="rounded-2xl object-cover w-auto h-auto"
                    />
                    <div>
                      <h3 className="font-semibold">{`Chat : ${c.title ?? "-"}`}</h3>
                      <p className="text-sm text-muted mt-1">Plano: <b>{c.treatmentPlan ?? "-"}</b></p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${st.className}`}>{st.label}</span>
                </div>

                <div className="mt-4 text-sm text-muted space-y-1">
                  <div>Criado: <b>{formatDate(c.caseCreatedAt)}</b></div>
                  <div>Atualizado: <b>{formatDate(c.caseUpdatedAt)}</b></div>
                  <div>Encerrado: <b>{formatDate(c.closeAt)}</b></div>
                </div>

                <div className="mt-5 flex justify-end">
                  <span className="text-sm font-medium text-brand-blue">Ir para chat →</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
