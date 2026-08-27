import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeWeeklyReport } from "@/lib/weeklyReport";
import { sendPushNotification } from "@/lib/push";

// GET /api/cron/relatorio-semanal?secret=...
// Opcional: chamado 1x por semana (ex: segunda de manhã) por um serviço
// externo de cron (o mesmo cron-job.org já usado pelos lembretes). Manda
// uma notificação push pra quem tiver ativado o sininho 🔔, avisando que o
// resumo da semana está pronto. Sem esse cron configurado, o relatório
// continua aparecendo sozinho dentro do app (banner) — o cron só existe
// pra avisar quem está com o app fechado.
//
// Guarda em "weekly_report_sent" pra nunca mandar duplicado, mesmo que o
// serviço externo chame mais de uma vez na mesma semana.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const report = await computeWeeklyReport(prisma, now);
  const weekStart = new Date(report.weekStart);

  const already = await prisma.weeklyReportSent.findUnique({
    where: { weekStart },
  });
  if (already) {
    return NextResponse.json({ skipped: true, reason: "já enviado essa semana" });
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  const body =
    report.totalCompleted > 0
      ? `${report.totalCompleted} tarefa(s) concluída(s) na semana passada. Toque para ver o resumo.`
      : "Nenhuma tarefa concluída na semana passada. Toque para ver o resumo.";

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  for (const sub of subscriptions) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { title: "📊 Relatório semanal", body, url: "/" }
    );
    if (result.ok) {
      sent++;
    } else {
      failed++;
      if (result.expired) expiredIds.push(sub.id);
    }
  }

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
  }

  // Marca como enviado mesmo se ninguém tinha push ativado — não faz
  // sentido recalcular e tentar de novo depois, o banner do app já cobre
  // quem não recebe push.
  await prisma.weeklyReportSent.create({ data: { weekStart } });

  return NextResponse.json({ sent, failed, totalCompleted: report.totalCompleted });
}
