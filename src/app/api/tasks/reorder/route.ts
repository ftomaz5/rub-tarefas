import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        position: z.number().int().min(0),
      })
    )
    .min(1)
    .max(200),
});

// PATCH /api/tasks/reorder
// Salva a nova ordem (posição) de várias tarefas de uma vez, usado quando o
// usuário arrasta um card para reordenar dentro da mesma coluna.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { items } = parsed.data;
  const ids = items.map((i) => i.id);

  const existingTasks = await prisma.task.findMany({
    where: { id: { in: ids } },
  });

  if (existingTasks.length !== ids.length) {
    return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  // Tarefa Pessoal: só o dono pode reordenar. Tarefa da Loja: qualquer
  // funcionário autenticado pode (mesma regra usada em PATCH /api/tasks/:id).
  const notAllowed = existingTasks.some(
    (t) => t.workspace === "PESSOAL" && t.ownerId !== session.user.id
  );
  if (notAllowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.task.update({
        where: { id: item.id },
        data: { position: item.position },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
