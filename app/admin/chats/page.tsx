"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import Link from "next/link";
import Pagination from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

// Layout adjusted: wider container and horizontal list

export default function AdminChatsPage() {
  const { isAuthenticated, user } = useAuth();
  const { fetchJson } = useApi();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.profile !== 1 && Number(user?.id) !== 3) {
      router.replace("/");
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/admin/chats")}`);
    }
  }, [isAuthenticated, user, router]);

  const [message, setMessage] = useState<string | null>(null);
  const [chats, setChats] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = /*#__PURE__*/ (null as unknown) as HTMLInputElement | null;

  // Date filter removed per request

  useEffect(() => {
    async function loadOpenChats() {
      if (!isAuthenticated || !user) return;
      // only for admins (profile === 1 or special id)
      if (user?.profile !== 1 && Number(user?.id) !== 3) return;
      try {
        setLoading(true);
        const data = await fetchJson<any[]>(`/api/Chats/open`);
        setChats(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro ao carregar chats");
      } finally {
        setLoading(false);
      }
    }

    loadOpenChats();
  }, [isAuthenticated, user]);

  useEffect(() => {
    setPage(1);
  }, [chats, pageSize]);

  const [filterUser, setFilterUser] = useState<string>("");
  const [onlyNotStarted, setOnlyNotStarted] = useState<boolean>(false);

  const userOptions = chats ? Array.from(new Set(chats.map((c: any) => c.userName).filter(Boolean))).sort() : [];

  function looksNotStarted(c: any) {
    try {
      // New rule: if `patientName` is null/undefined/empty -> consider not started
      const pn = c?.patientName ?? c?.patient_name ?? c?.PatientName ?? c?.title ?? null;
      if (pn == null) return true;
      if (typeof pn === "string" && pn.trim() === "") return true;
    } catch (e) {
      // ignore
    }
    return false;
  }

  const filteredChats = chats
    ? chats.filter((c: any) => {
        if (filterUser && c.userName !== filterUser) return false;
        if (onlyNotStarted) {
          if (!looksNotStarted(c)) return false;
        } else {
          // when checkbox is not checked, show only initialized chats (i.e. NOT not-started)
          if (looksNotStarted(c)) return false;
        }
        return true;
      })
    : [];

  const selectedHasNotStarted = (() => {
    try {
      if (!selected || !chats || selected.size === 0) return false;
      for (const id of Array.from(selected)) {
        const c = chats.find((x: any) => String(x.chatId) === String(id));
        if (c && looksNotStarted(c)) return true;
      }
    } catch (e) {}
    return false;
  })();

  

  async function handleApply() {
    if (!selected || selected.size === 0) {
      setMessage("Nenhum chat selecionado.");
      return;
    }

    try {
      setLoading(true);
      const adminId = user?.id ? Number(user.id) : 3;
      const chatIds = Array.from(selected);
      await fetchJson(`/api/chats/close-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, chatIds }),
      });

      setMessage(`${selected.size} chat(s) processado(s) com sucesso.`);
      // remover chats fechados da lista e limpar seleção
      setChats((prev) => (prev ? prev.filter((c: any) => !selected.has(String(c.chatId))) : prev));
      setSelected(new Set());
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || "Erro ao aplicar ação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      

      <Card className="p-6">
        {/* Date filter removed */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Chats Abertos</h2>
          {loading && (
            <div className="text-sm text-muted flex items-center gap-2">
              <Spinner size={18} />
              <span>Carregando...</span>
            </div>
          )}
          {error && <div className="text-sm text-red-500">{error}</div>}
          {!loading && chats && chats.length === 0 && <div className="text-sm text-muted">Nenhum chat em aberto.</div>}
          {!loading && chats && chats.length > 0 && (
            <div>
              {/* Linha de ações: Filtrar por dentista, Selecionar todos, Aplicar (estilizado) */}
              <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800 mb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted mb-1">Dentista responsável</label>
                      <select value={filterUser} onChange={(e) => {
                        const newFilter = e.target.value;
                        setFilterUser(newFilter);
                        setPage(1);
                        if (!chats) {
                          setSelected(new Set());
                          return;
                        }
                        const allowed = new Set(chats
                          .filter((c: any) => {
                            if (newFilter && c.userName !== newFilter) return false;
                            if (onlyNotStarted) {
                              if (!looksNotStarted(c)) return false;
                            } else {
                              if (looksNotStarted(c)) return false;
                            }
                            return true;
                          })
                          .map((c: any) => String(c.chatId)));
                        setSelected((prev) => {
                          const next = new Set<string>();
                          prev.forEach((id) => { if (allowed.has(id)) next.add(id); });
                          return next;
                        });
                      }} className="border rounded-md px-3 py-2 bg-white">
                        <option value="">Todos</option>
                        {userOptions.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                      <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={(() => {
                          if (!filteredChats) return false;
                          return filteredChats.length > 0 && filteredChats.every((x: any) => selected.has(String(x.chatId)));
                        })()}
                        onChange={() => {
                          if (!filteredChats) return;
                          const allIds = filteredChats.map((x: any) => String(x.chatId));
                          const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (allSelected) {
                              allIds.forEach((id) => next.delete(id));
                            } else {
                              allIds.forEach((id) => next.add(id));
                            }
                            return next;
                          });
                        }}
                        className="h-4 w-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Selecionar todos</span>
                        <span className="text-xs text-muted">{selected.size} selecionado(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={onlyNotStarted}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setOnlyNotStarted(val);
                            setPage(1);
                            if (!chats) {
                              setSelected(new Set());
                              return;
                            }
                            const allowed = new Set(chats
                              .filter((c: any) => {
                                if (filterUser && c.userName !== filterUser) return false;
                                if (val) {
                                  if (!looksNotStarted(c)) return false;
                                } else {
                                  if (looksNotStarted(c)) return false;
                                }
                                return true;
                              })
                              .map((c: any) => String(c.chatId)));
                            setSelected((prev) => {
                              const next = new Set<string>();
                              prev.forEach((id) => { if (allowed.has(id)) next.add(id); });
                              return next;
                            });
                          }}
                          className="h-4 w-4"
                        />
                        <span className="text-sm font-medium">Chats não iniciados</span>
                      </label>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          if (selectedHasNotStarted) return;
                          handleApply();
                        }}
                        disabled={selectedHasNotStarted || loading || selected.size === 0}
                        title={selectedHasNotStarted ? "A seleção contém chats não iniciados" : undefined}
                        className="px-3 py-1"
                      >Aplicar</Button>
                      <Button onClick={() => { setFilterUser(""); setOnlyNotStarted(false); setSelected(new Set()); setPage(1); }} className="px-3 py-1">Limpar</Button>
                    </div>
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
                  const start = (page - 1) * pageSize;
                  const end = start + pageSize;
                  const paged = filteredChats.slice(start, end);
                  return paged.map((c: any) => {
                    const id = String(c.chatId);
                    const checked = selected.has(id);
                    return (
                      <Link key={c.chatId} href={`/chat/${c.chatId}`} className="block border rounded-md p-3 hover:shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(id)) next.delete(id);
                                  else next.add(id);
                                  return next;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="font-medium">{c.patientName ?? "Sem paciente definido"}</div>
                              <div className="text-sm text-muted">{c.lastMessagePreview}</div>
                              <div className="text-xs text-muted">Dentista responsável: {c.userName || "—"}</div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted w-48">
                            <div>{new Date(c.lastMessageAt).toLocaleString()}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  });
                })()}
              </div>

              

              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(filteredChats.length / pageSize))}
                onPageChange={(p) => setPage(p)}
              />
              <div className="mt-4 flex justify-between items-center text-sm text-muted">
                <div>Total: {filteredChats.length} chats</div>
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
