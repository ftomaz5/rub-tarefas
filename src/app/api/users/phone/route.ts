import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  userId: z.string(),
  phone: z.string().min(10, "Telefone inválido").max(20),
});

// Salva/atualiza o WhatsApp de um funcionário. Usado pelo botão "Enviar no
// WhatsApp" na tarefa quando o número ainda não está cadastrado — qualquer
// funcionário autenticado pode preencher o próprio número ou o de um colega
// (útil quando quem está montando a tarefa sabe o número e o colega ainda
// não usou essa tela).
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { phone: parsed.data.phone },
    select: { id: true, name: true, phone: true },
  });

  return NextResponse.json({ user: updated });
}
