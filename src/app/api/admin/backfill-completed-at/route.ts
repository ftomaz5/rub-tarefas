import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/backfill-completed-at?secret=...
// Utilitário de UMA VEZ SÓ: corrige tarefas que já estão na coluna "Feito"
// mas ficaram com completedAt vazio (bug corrigido nesta mesma atualização —
// veja o PATCH /api/tasks/:id). Sem completedAt, essas tarefas não apareciam
// no relatório semanal nem no painel, mesmo estando certinhas no quadro.
//
// Usa updatedAt como data de conclusão (a melhor aproximação disponível,
// já que não tinha como saber a hora exata antes da correção). Seguro rodar
// mais de uma vez — só mexe em tarefas que ainda estão com completedAt vazio.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tasksToFix = await prisma.task.findMany({
    where: { status: "FEITO", completedAt: null },
    select: { id: true, updatedAt: true, clientName: true },
  });

  for (const t of tasksToFix) {
    await prisma.task.update({
      where: { id: t.id },
      data: { completedAt: t.updatedAt },
    });
  }

  return NextResponse.json({
    corrigidas: tasksToFix.length,
    tarefas: tasksToFix.map((t) => ({ id: t.id, cliente: t.clientName })),
  });
}
