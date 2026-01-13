import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, newpassword } = body ?? {};

    if (!email || !newpassword) {
      return NextResponse.json({ message: "Email e newpassword são obrigatórios." }, { status: 400 });
    }

    // TODO: integrar com banco/serviço de auth.
    // Implementação de teste: apenas retorna sucesso.
    return NextResponse.json({ message: "Senha alterada com sucesso (simulada)." }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: String(err?.message ?? "Erro no servidor.") }, { status: 500 });
  }
}
