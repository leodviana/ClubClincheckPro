"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function ChangePasswordModal() {
  const { user, isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) return null;

  async function submitChange(e: any) {
    e.preventDefault();
    if (!newPwd || newPwd !== confirmPwd) return alert("As senhas não coincidem.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, currentPassword: currentPwd, newPassword: newPwd }),
      });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      alert("Solicitação de alteração enviada com sucesso.");
      setShow(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err: any) {
      alert("Erro: " + (err?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button onClick={() => setShow(true)} className="text-sm px-3 py-2 bg-slate-100 rounded-md">Trocar senha</button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" />
          <Card className="relative w-full max-w-md bg-card border p-6 overflow-hidden rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Trocar senha</h3>
              <button onClick={() => setShow(false)} className="text-sm text-muted">Fechar</button>
            </div>

            <form onSubmit={submitChange} className="space-y-3">
              <div>
                <label className="text-xs text-muted">Usuário</label>
                <div className="mt-1 text-sm font-medium">{user?.email ?? (user as any)?.nome ?? "—"}</div>
              </div>

              <div>
                <label className="text-xs text-muted">Senha atual</label>
                <Input value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} type="password" className="mt-1" />
              </div>

              <div>
                <label className="text-xs text-muted">Nova senha</label>
                <Input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} type="password" className="mt-1" />
              </div>

              <div>
                <label className="text-xs text-muted">Confirme nova senha</label>
                <Input value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} type="password" className="mt-1" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setShow(false)} className="px-3 py-2">Cancelar</Button>
                <Button type="submit" className="px-4 py-2" disabled={submitting}>{submitting ? "Enviando..." : "Solicitar alteração"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
