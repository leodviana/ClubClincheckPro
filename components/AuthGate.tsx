"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type Props = { children: ReactNode };

const PUBLIC_PATHS = new Set(["/login", "/recuperar"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/icon")) return true;
  if (pathname.startsWith("/apple-icon")) return true;
  if (pathname.startsWith("/robots")) return true;
  if (pathname.startsWith("/sitemap")) return true;
  return false;
}

export default function AuthGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { status, isAuthenticated, refreshSession } = useAuth();

  const publicRoute = useMemo(() => isPublicPath(pathname), [pathname]);

  // Evita flash: só libera render das rotas protegidas após checar sessão
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (publicRoute) {
        if (alive) setChecked(true);
        return;
      }

      // Se já autenticado, libera
      if (isAuthenticated) {
        if (alive) setChecked(true);
        return;
      }

      // Se ainda carregando status, aguarda
      if (status === "loading") return;

      // Tenta refresh uma vez (caso cookie tenha sido setado em outra aba)
      const token = await refreshSession();

      // Depois do refresh, se continuar não autenticado, redireciona
      if (alive && !token) {
        const next = encodeURIComponent(pathname);
        router.replace(`/login?next=${next}`);
      }
    }

    run().finally(() => {
      if (alive) setChecked(true);
    });

    return () => {
      alive = false;
    };
  }, [publicRoute, isAuthenticated, status, pathname, router, refreshSession]);

  if (publicRoute) return <>{children}</>;

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="text-sm text-muted">Carregando...</div>
      </div>
    );
  }

  return <>{children}</>;
}
