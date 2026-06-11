"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import Pagination from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";

export default function AdminClosedChatsPage() {
  const { isAuthenticated, user } = useAuth();
  const { fetchJson } = useApi();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.profile !== 1 && Number(user?.id) !== 3) {
      router.replace("/");
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/admin/chats/closed")}`);
    }
  }, [isAuthenticated, user, router]);

  const [chats, setChats] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterUser, setFilterUser] = useState<string>("");

  useEffect(() => {
    async function loadClosedChats() {
      if (!isAuthenticated || !user) return;
      if (user?.profile !== 1 && Number(user?.id) !== 3) return;
      try {
        setLoading(true);
        const data = await fetchJson<any[]>(`/api/Chats/closed`);
        setChats(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Erro ao carregar chats fechados");
      } finally {
        setLoading(false);
      }
    }

    loadClosedChats();
  }, [isAuthenticated, user]);

  useEffect(() => { setPage(1); }, [chats, pageSize]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <Card className="p-6">
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Chats Fechados</h2>
          {loading && (
            <div className="text-sm text-muted flex items-center gap-2">
              <Spinner size={18} />
              <span>Carregando...</span>
            </div>
          )}
          {error && <div className="text-sm text-red-500">{error}</div>}
          {!loading && chats && chats.length === 0 && <div className="text-sm text-muted">Nenhum chat encerrado encontrado.</div>}
          {!loading && chats && chats.length > 0 && (
            <div>
              <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800 mb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">Dentista responsável</label>
                      <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(1); }} className="border rounded-md px-3 py-2 bg-white">
                        <option value="">Todos</option>
                        {(() => {
                          const userOptions = chats ? Array.from(new Set(chats.map((c: any) => c.userName).filter(Boolean))).sort() : [];
                          return userOptions.map((u) => (<option key={u} value={u}>{u}</option>));
                        })()}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:gap-6">
                    <Button onClick={() => { setFilterUser(""); setPage(1); }} className="px-3 py-1">Limpar</Button>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2 text-sm text-muted border-b">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">Paciente</div>
                    <div className="text-xs">Última mensagem</div>
                  </div>
                  <div className="w-48 text-right">
                    <div className="text-xs">Última atividade</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {(() => {
                  const filteredChats = chats ? chats.filter((c: any) => { if (filterUser && c.userName !== filterUser) return false; return true; }) : [];
                  const start = (page - 1) * pageSize;
                  const end = start + pageSize;
                  const paged = filteredChats.slice(start, end);
                  return paged.map((c: any) => (
                    <Link key={c.chatId} href={`/chat/${c.chatId}`} className="block border rounded-md p-3 hover:shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{c.patientName ?? "Sem paciente definido"}</div>
                          <div className="text-sm text-muted">{c.lastMessagePreview}</div>
                          <div className="text-xs text-muted">Dentista responsável: {c.userName || "—"}</div>
                        </div>
                        <div className="text-right text-sm text-muted w-48">
                          <div>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : "—"}</div>
                        </div>
                      </div>
                    </Link>
                  ));
                })()}
              </div>

              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil((chats ? chats.filter((c: any) => { if (filterUser && c.userName !== filterUser) return false; return true; }).length : 0) / pageSize))}
                onPageChange={(p) => setPage(p)}
              />

              <div className="mt-4 flex justify-between items-center text-sm text-muted">
                <div>Total: {chats ? chats.filter((c: any) => { if (filterUser && c.userName !== filterUser) return false; return true; }).length : 0} chats</div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted">Por página</label>
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded-md px-2 py-1">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
