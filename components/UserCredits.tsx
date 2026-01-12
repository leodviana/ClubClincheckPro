"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { useEffect, useState } from "react";

type Credit = {
  id: string;
  title?: string;
  remaining?: number;
  status?: string;
  createdAt?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
};

export default function UserCredits() {
  const { user, isAuthenticated, accessToken } = useAuth();
  const { fetchJson } = useApi();
  // Inicializa vazio para não exibir dados de outro usuário antes do fetch
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (banner removed) -- no display variables here anymore

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

    // Limpa imediatamente os créditos anteriores ao detectar mudança de usuário/autenticação
    setCredits([]);

    if (!tokenId) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      // Limpa créditos anteriores ao buscar os do novo usuário
      setCredits([]);
      try {
          // Endpoint protegido — usamos o hook `useApi` que aplica Bearer + refresh
          // Passamos o id do usuário como path param
          const path = `/api/chats/by-user/${tokenId}`;
          const data = await fetchJson<any>(path);

          if (!mounted) return;

          const rawList = Array.isArray(data) ? data : data?.data ?? [];

          // Normalize items to expected shape
          const list: Credit[] = (rawList || []).map((it: any) => ({
            id: (it.id ?? it.chatId ?? it.chat_id ?? it.uuid ?? it.uuid_chat ?? "").toString(),
            title: it.title ?? it.nome ?? it.caseTitle ?? it.title_chat ?? `Chat ${it.id ?? ''}`,
            remaining: it.remaining ?? it.creditos ?? it.messagesRemaining ?? 0,
            status: it.status ?? it.state ?? it.status_text ?? undefined,
            createdAt: it.createdAt ?? it.created_at ?? it.dt_criacao ?? null,
            openAt: it.openedAt ?? it.openAt ?? it.open_at ?? it.dt_abertura ?? null,
            closeAt: it.closedAt ?? it.closeAt ?? it.closed_at ?? it.dt_encerramento ?? null,
          }));

          setCredits(list as Credit[]);
        } catch (err: any) {
        setError(err?.message ?? "Erro ao carregar créditos");
        // Em caso de falha, não manter os créditos antigos
        setCredits([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  // Depend on `user?.id`, `accessToken` and `isAuthenticated` so effect runs on auth changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, accessToken, isAuthenticated]);

  // Se não autenticado, não renderiza (AuthGate deveria cuidar disso)
  if (!isAuthenticated) return null;

  // Se é admin (profile === 1), não mostrar a lista de créditos
  if (user?.profile === 1) return null;

  function formatDate(v?: string | null) {
    if (!v) return "-";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return String(v);
    }
  }

  function friendlyDate(v?: string | null) {
    if (!v) return "-";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString("pt-BR");
    } catch {
      return String(v);
    }
  }

  function shortIdFromGuid(guid?: string) {
    if (!guid) return "-";
    const cleaned = guid.replace(/-/g, "");
    return cleaned.slice(0, 8).toLowerCase();
  }

  function normalizeStatus(raw: any) {
    if (raw == null) return { key: "nao_iniciado", label: "Não iniciado", className: "bg-slate-100 text-slate-600" };
    if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
      const n = Number(raw);
      if (n === 1) return { key: "aberto", label: "Aberto", className: "bg-green-100 text-green-700" };
      if (n === 2) return { key: "encerrado", label: "Encerrado", className: "bg-slate-100 text-slate-600" };
      return { key: "nao_iniciado", label: "Não iniciado", className: "bg-slate-100 text-slate-600" };
    }

    const s = String(raw).toLowerCase();
    if (s.includes("open") || s.includes("abert")) return { key: "aberto", label: "Em aberto", className: "bg-green-100 text-green-700" };
    if (s.includes("clos") || s.includes("fech") || s.includes("encerr")) return { key: "encerrado", label: "Encerrado", className: "bg-slate-100 text-slate-600" };
    if (s.includes("lock") || s.includes("bloq") || s.includes("final")) return { key: "encerrado", label: "Encerrado", className: "bg-slate-100 text-slate-600" };

    return { key: "nao_iniciado", label: String(raw), className: "bg-slate-100 text-slate-600" };
  }

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
                  // ignore sessionStorage errors (e.g., disabled)
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
                      <h3 className="font-semibold">{c.title ?? `Caso #${idx + 1}`}</h3>
                      <p className="text-sm text-muted">Criado: <b>{friendlyDate(c.createdAt)}</b> · ID: <b title={c.id}>{shortIdFromGuid(c.id)}</b></p>
                      <p className="text-xs text-muted">Chat No: <b>#{idx + 1}</b></p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${st.className}`}>{st.label}</span>
                </div>

                <div className="mt-4 text-sm text-muted space-y-1">
                  <div>Criado: <b>{formatDate(c.createdAt)}</b></div>
                  <div>Aberto: <b>{formatDate(c.openAt)}</b></div>
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
