"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function NavAuth() {
  const { isAuthenticated, user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  const next = useMemo(() => encodeURIComponent(pathname), [pathname]);
  const [busy, setBusy] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  if (!isAuthenticated) {
    return (
      <nav className="flex items-center gap-4 text-sm text-muted">
        <Link href={`/login?next=${next}`} className="hover:text-text">Entrar</Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm text-muted">
      {user?.profile === 1 ? (
        <Link href="/admin/chats" className="hover:text-text">Admin</Link>
      ) : (
        <Link href="/" className="hover:text-text">Início</Link>
      )}

      <div className="flex items-center gap-3">
        <Avatar name={user?.nome ?? user?.email ?? "Usuário"} />
        <span className="text-sm font-medium hidden sm:inline">{user?.nome ?? user?.email}</span>
      </div>

      <button onClick={() => setShowChangePwd(true)} className="text-sm text-muted hover:text-text">Trocar senha</button>

      {showChangePwd && <ChangePasswordForm onClose={() => setShowChangePwd(false)} />}

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await signOut();
            router.replace("/login");
          } finally {
            setBusy(false);
          }
        }}
        className={`hover:text-text ${busy ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        Sair
      </button>
    </nav>
  );
}
