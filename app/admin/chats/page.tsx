"use client";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

type ChatRow = { id: string; paciente: string; dentista: string; status: "aberto"|"andamento"|"fechado"; updatedAt: string; };
const DATA: ChatRow[] = [
  { id: "chat-ortho-001", paciente: "Maria S.", dentista: "Dr. Leo", status: "aberto", updatedAt: "2025-10-30T12:00:00" },
  { id: "chat-ortho-002", paciente: "João P.", dentista: "Dr. Leo", status: "andamento", updatedAt: "2025-10-30T11:40:00" },
  { id: "chat-ortho-003", paciente: "Ana C.", dentista: "Dr. Leo", status: "fechado", updatedAt: "2025-10-28T10:30:00" },
];

export default function AdminChatsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.profile !== 1 && Number(user?.id) !== 3) {
      router.replace("/");
    }
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/admin/chats")}`);
    }
  }, [isAuthenticated, user, router]);

  const [q, setQ] = useState("");  
  const [status, setStatus] = useState<"todos"|ChatRow["status"]>("todos");

  const rows = useMemo(() => {
    return DATA.filter(r => (status === "todos" || r.status === status) && (r.id+" "+r.paciente+" "+r.dentista).toLowerCase().includes(q.toLowerCase()))
      .sort((a,b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [q, status]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chats</h1>
          <p className="text-muted">Visualize e entre nos atendimentos dos alunos.</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..." className="border rounded-xl px-3 py-2 text-sm" />
          <select value={status} onChange={e=>setStatus(e.target.value as any)} className="border rounded-xl px-3 py-2 text-sm">
            <option value="todos">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="andamento">Em andamento</option>
            <option value="fechado">Fechado</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-muted">
            <tr>
              <th className="py-3 px-4">Chat</th>
              <th className="py-3 px-4">Paciente</th>
              <th className="py-3 px-4">Profissional</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Atualizado</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="py-3 px-4 font-medium">{c.id}</td>
                <td className="py-3 px-4">{c.paciente}</td>
                <td className="py-3 px-4">{c.dentista}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status==='aberto'?'bg-green-100 text-green-700':c.status==='andamento'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                </td>
                <td className="py-3 px-4 text-right">{new Date(c.updatedAt).toLocaleString('pt-BR')}</td>
                <td className="py-3 px-4 text-right">
                  <Link href={`/chat/${c.id}`} className="text-xs px-3 py-1 rounded-lg bg-gradient-to-r from-brand-pink via-brand-magenta to-brand-blue text-white">Abrir chat</Link>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={6} className="py-10 text-center text-muted">Nenhum chat encontrado com os filtros atuais.</td></tr>
            )}
          </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
