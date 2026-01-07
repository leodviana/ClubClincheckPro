import UserCredits from "@/components/UserCredits";
import AdminRedirect from "@/components/AdminRedirect";
 

const mockCredits = [
  { id: "chat-ortho-001", title: "Caso Invisalign #001", remaining: 5, status: "aberto" },
  { id: "chat-ortho-002", title: "Caso Invisalign #002", remaining: 2, status: "andamento" },
  { id: "chat-ortho-003", title: "Caso Invisalign #003", remaining: 0, status: "encerrado" },
  { id: "chat-ortho-004", title: "Caso Invisalign #004", remaining: 0, status: "Bloqueado" }
];

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
