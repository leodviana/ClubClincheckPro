import UserCredits from "@/components/UserCredits";
import AdminRedirect from "@/components/AdminRedirect";
// ChangePasswordModal moved into navbar; no direct import here.

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <AdminRedirect />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meus créditos</h1>
          <p className="text-muted">Clique em um crédito para abrir o chat com o especialista.</p>
        </div>

        <div className="flex items-center gap-2">
        </div>
      </div>

      <div>
        {/* Componente cliente que mostra créditos apenas para usuário não-admin */}
        <UserCredits />
      </div>
    </div>
  );
}
