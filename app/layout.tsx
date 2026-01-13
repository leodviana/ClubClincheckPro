import "@/styles/globals.css";
import Image from "next/image";
import type { Metadata } from "next";
import AuthGate from "@/components/AuthGate";
import NavAuth from "@/components/NavAuth";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "ClubClincheck",
  description: "Plataforma de atendimento e revisão de ClinCheck",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-20 h-14 border-b bg-white flex items-center px-6 justify-between">
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center gap-3">
                  <Image src="/logo.png" alt="ClubClincheck" width={180} height={40} priority className="h-auto" />
                </a>
              </div>

              <NavAuth />
            </header>

            <main className="flex-1 main-bg">
              <AuthGate>{children}</AuthGate>
            </main>

            <footer className="py-6 text-center text-xs text-muted">
              © {new Date().getFullYear()} ClubClincheck
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
