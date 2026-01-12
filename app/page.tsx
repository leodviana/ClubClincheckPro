import UserCredits from "@/components/UserCredits";
import AdminRedirect from "@/components/AdminRedirect";
export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <AdminRedirect />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meus créditos</h1>
        <p className="text-muted">Clique em um crédito para abrir o chat com o especialista.</p>
      </div>
          <div>
        {/* Componente cliente que mostra créditos apenas para usuário não-admin */}
        <UserCredits />
      </div>
    </div>
  );
}
