"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  showAdminLink?: boolean;
};

export default function NavAuth({ showAdminLink = true }: Props) {
  const { isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  const next = useMemo(() => encodeURIComponent(pathname), [pathname]);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
    return (
      <nav className="flex items-center gap-4 text-sm text-muted">
        <Link href={`/login?next=${next}`} className="hover:text-text">Entrar</Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm text-muted">
      <Link href="/" className="hover:text-text">Início</Link>
      {showAdminLink && <Link href="/admin/chats" className="hover:text-text">Admin</Link>}
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
