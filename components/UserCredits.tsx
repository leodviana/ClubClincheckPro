"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

const mockCredits = [
  { id: "chat-ortho-001", title: "Caso Invisalign #001", remaining: 5, status: "aberto" },
  { id: "chat-ortho-002", title: "Caso Invisalign #002", remaining: 2, status: "andamento" },
  { id: "chat-ortho-003", title: "Caso Invisalign #003", remaining: 0, status: "encerrado" },
  { id: "chat-ortho-004", title: "Caso Invisalign #004", remaining: 0, status: "Bloqueado" }
];

export default function UserCredits() {
  const { user, isAuthenticated } = useAuth();

  // Se não autenticado, não renderiza (AuthGate deveria cuidar disso)
  if (!isAuthenticated) return null;

  // Se é admin (profile === 1), não mostrar a lista de créditos
  if (user?.profile === 1) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {mockCredits.map((c) => (
        <Link key={c.id} href={`/chat/${c.id}`}>
          <Card className={`p-6 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md ${c.remaining>0 ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/logosemnome.png"
                  alt={c.title}
                  width={40}
                  height={40}
                  className="rounded-2xl object-cover"
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
  );
}
