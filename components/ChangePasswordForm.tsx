"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function ChangePasswordForm({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function submitChange(e: any) {
    e.preventDefault();
    // final validation before submit
    if (!newPwd) {
      setError("Informe a nova senha.");
      return;
    }
    if (newPwd.length < 5) {
      setError("A senha deve ter ao menos 5 caracteres.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("As senhas não coincidem.");
      return;
    }
    setError(null);
    setOkMessage(null);
    setSubmitting(true);
    try {
      const email = (user && (user.email || (user as any).nome)) || "";
      const res = await fetch("/api/Login/resetPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newpassword: newPwd }),
      });

      const text = await res.text();
      let payload: any = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (e) {
        payload = { message: text };
      }

      if (!res.ok) {
        const msg = payload?.message ?? res.statusText ?? "Erro ao alterar senha.";
        setError(String(msg));
        return;
      }

      const msg = payload?.message ?? "Senha alterada com sucesso.";
      setOkMessage(String(msg));
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => onClose?.(), 1200);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose?.()} />
      <Card className="relative w-full max-w-md bg-card border p-6 overflow-hidden rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Trocar senha</h3>
          <button onClick={() => onClose?.()} className="text-sm text-muted">Fechar</button>
        </div>
        {error && (
          <div role="alert" className="mb-2 text-sm text-red-600">{error}</div>
        )}
        {okMessage && (
          <div role="status" aria-live="polite" className="mb-2 text-sm text-green-600">{okMessage}</div>
        )}

        <form onSubmit={submitChange} className="space-y-3">
          <div>
            <label className="text-xs text-muted">Usuário</label>
            <div className="mt-1 text-sm font-medium">{user?.email ?? (user as any)?.nome ?? "—"}</div>
          </div>

          {/* removed old password field as requested */}

          <div>
            <label className="block text-xs text-muted">Nova senha</label>
            <Input
              value={newPwd}
              onChange={(e) => {
                setNewPwd(e.target.value);
                setError(null);
              }}
              onBlur={() => setTouchedConfirm(true)}
              type="password"
              className="mt-1 w-full"
            />
            {newPwd && newPwd.length < 5 && (
              <div className="mt-1 text-xs text-red-600">A senha deve ter ao menos 5 caracteres.</div>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted">Confirme nova senha</label>
            <Input
              value={confirmPwd}
              onChange={(e) => {
                setConfirmPwd(e.target.value);
                setError(null);
              }}
              onBlur={() => setTouchedConfirm(true)}
              type="password"
              className="mt-1 w-full"
            />
            {touchedConfirm && newPwd !== confirmPwd && (
              <div className="mt-1 text-xs text-red-600">As senhas não coincidem.</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" onClick={() => onClose?.()} className="px-3 py-2">Cancelar</Button>
            <Button
              type="submit"
              className="px-4 py-2"
              disabled={
                submitting || !newPwd || newPwd.length < 5 || newPwd !== confirmPwd
              }
            >
              {submitting ? "Enviando..." : "Solicitar alteração"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
