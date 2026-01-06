import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Image from "next/image";
 

const mockCredits = [
  { id: "chat-ortho-001", title: "Caso Invisalign #001", remaining: 5, status: "aberto" },
  { id: "chat-ortho-002", title: "Caso Invisalign #002", remaining: 2, status: "andamento" },
  { id: "chat-ortho-003", title: "Caso Invisalign #003", remaining: 0, status: "encerrado" },
  { id: "chat-ortho-004", title: "Caso Invisalign #004", remaining: 0, status: "Bloqueado" }
];

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meus créditos</h1>
        <p className="text-muted">Clique em um crédito para abrir o chat com o especialista.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockCredits.map((c) => (
          <Link key={c.id} href={`/chat/${c.id}`}>
            <Card className={`p-6 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md ${c.remaining>0 ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  
      <Image
        src="/logosemnome.png"       // troque pelo seu arquivo em /public
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
    </div>
  );
}
