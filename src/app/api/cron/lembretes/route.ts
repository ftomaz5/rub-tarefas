import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

// GET /api/cron/lembretes?secret=...
// Chamado por um serviço externo de cron (ex: cron-job.org) a cada 5 minutos.
// Verifica tarefas com prazo entre 15 e 20 minutos à frente (janela = intervalo
// da checagem, para não perder nem duplicar nenhum lembrete) e envia push
// para o responsável (ou para o dono, se não houver responsável).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 15 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 20 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: windowStart, lt: windowEnd },
      completedAt: null,
      status: { not: "FEITO" },
      reminderSentAt: null,
    },
    include: {
      owner: { include: { pushSubscriptions: true } },
      assignee: { include: { pushSubscriptions: true } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const task of tasks) {
    const recipient = task.assignee ?? task.owner;
    const subscriptions = recipient.pushSubscriptions;

    if (subscriptions.length === 0) {
      // Ninguém para notificar (usuário não autorizou notificações neste dispositivo).
      // Marca como enviado mesmo assim para não ficar reprocessando à toa.
      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSentAt: now },
      });
      continue;
    }

    const timeLabel = new Date(task.dueDate!).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let anySuccess = false;
    const expiredIds: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: "Lembrete de tarefa",
          body: `"${task.title}" está marcada para ${timeLabel} (em 15 min).`,
          url: "/",
        }
      );
      if (result.ok) {
        anySuccess = true;
        sent++;
      } else {
        failed++;
        if (result.expired) expiredIds.push(sub.id);
      }
    }

    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      });
    }

    if (anySuccess || subscriptions.length > 0) {
      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSentAt: now },
      });
    }
  }

  return NextResponse.json({ checked: tasks.length, sent, failed });
}
