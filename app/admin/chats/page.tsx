"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminChatsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.profile !== 1 && Number(user?.id) !== 3) {
      router.replace("/");
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/admin/chats")}`);
    }
  }, [isAuthenticated, user, router]);

  const [startDate, setStartDate] = useState<string>(todayDateString());
  const [endDate, setEndDate] = useState<string>(todayDateString());
  const [message, setMessage] = useState<string | null>(null);

  function handleFilter() {
    // Placeholder action: you can replace with a fetch/route update
    setMessage(`Filtrando de ${startDate} até ${endDate}`);
    console.log("Filtrar chats entre:", startDate, endDate);
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Chats — Filtrar por data</h1>
        <p className="text-muted">Selecione o intervalo e clique em Filtrar.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-muted mb-1">Data início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-md px-3 py-2" />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-muted mb-1">Data fim</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-md px-3 py-2" />
          </div>

          <div>
            <button onClick={handleFilter} className="mt-4 md:mt-0 bg-brand-blue text-white px-4 py-2 rounded-md">Filtrar</button>
          </div>
        </div>

        {message && <div className="mt-4 text-sm text-muted">{message}</div>}
      </Card>
    </div>
  );
}
