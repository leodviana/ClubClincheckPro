import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Administração - ClubClincheck",
};

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-muted">Painel administrativo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/chats/pending-admin-response" className="block">
          <Card className={`p-6 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Image src="/logosemnome.png" alt="Atividade de chats" width={40} height={40} className="rounded-2xl object-cover w-auto h-auto" />
                <div>
                  <h3 className="font-semibold">Atividade de chats</h3>
                  <p className="text-sm text-muted mt-1">Painel de Gerenciamento de chats que precisem atenção.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <span className="text-sm font-medium text-brand-blue">Abrir →</span>
            </div>
          </Card>
        </Link>

        <Link href="/admin/chats" className="block">
          <Card className={`p-6 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Image src="/logosemnome.png" alt="Fechamento de chats" width={40} height={40} className="rounded-2xl object-cover w-auto h-auto" />
                <div>
                  <h3 className="font-semibold">Fechamento de chats</h3>
                  <p className="text-sm text-muted mt-1">Gerenciar e encerrar chats abertos.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <span className="text-sm font-medium text-brand-blue">Abrir →</span>
            </div>
          </Card>
        </Link>
        
        {/* Removed separate 'Pendentes' card per request; 'Atividade de chats' now points to pending-admin-response */}
      </div>
    </div>
  );
}
