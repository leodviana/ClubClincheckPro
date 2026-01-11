"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { useEffect, useState } from "react";

type Credit = { id: string; title: string; remaining: number; status: string };

const initialMock: Credit[] = [
  { id: "chat-ortho-001", title: "Caso Invisalign #001", remaining: 5, status: "aberto" },
  { id: "chat-ortho-002", title: "Caso Invisalign #002", remaining: 2, status: "andamento" },
  { id: "chat-ortho-003", title: "Caso Invisalign #003", remaining: 0, status: "encerrado" },
  { id: "chat-ortho-004", title: "Caso Invisalign #004", remaining: 0, status: "Bloqueado" }
];

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
        const data = await fetchJson<Credit[]>(path);

        if (!mounted) return;

        // Se o servidor retornar um objeto contendo `data`, tente usar esse array.
        const list = Array.isArray(data) ? data : (data as any)?.data ?? initialMock;
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

  return (
    <div>
      {loading && <p className="text-sm text-muted mb-4">Carregando créditos...</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {credits.map((c) => (
          <Link key={c.id} href={`/chat/${c.id}`}>
            <Card className={`p-6 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md ${c.remaining>0 ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logosemnome.png"
                    alt={c.title}
                    width={40}
                    height={40}
                    className="rounded-2xl object-cover w-auto h-auto"
                  />
                  <div>
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="text-sm text-muted">Mensagens restantes: <b>{c.remaining}</b></p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  c.status === 'aberto' ? 'bg-green-100 text-green-700' :
                  c.status === 'andamento' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'}`}>{c.status}</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-pink via-brand-magenta to-brand-blue" style={{ width: `${Math.min(c.remaining*20,100)}%` }} />
              </div>
              <div className="mt-5 flex justify-end">
                <span className="text-sm font-medium text-brand-blue">Abrir chat →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
