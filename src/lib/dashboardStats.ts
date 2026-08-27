import type { PrismaClient } from "@prisma/client";

// Dados do painel de indicadores (/dashboard). Escopo: só tarefas da LOJA,
// últimos 6 meses (mês atual incluso, mesmo que ainda incompleto). Usa UTC
// pros limites de mês, mesmo padrão simples já usado no relatório semanal.

export interface DashboardData {
  periodMonths: number;
  monthly: { month: string; label: string; count: number }[];
  byUser: { name: string; count: number }[];
  totalCompleted: number; // total no período de 6 meses
  completedToday: number;
  completedThisMonth: number;
  avgCompletionHours: number | null;
  topClients: { clientName: string; count: number }[];
  // Cliente da tarefa concluída mais recentemente no período (não é o mesmo
  // que o "mais recorrente" acima — esse é sobre frequência, este é sobre
  // ordem no tempo).
  mostRecentClient: { clientName: string; completedAt: string } | null;
}

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function monthStart(year: number, month: number): Date {
  // month: 0-11
  return new Date(Date.UTC(year, month, 1));
}

export async function computeDashboardStats(
  prisma: PrismaClient,
  reference: Date = new Date(),
  periodMonths = 6
): Promise<DashboardData> {
  const currentMonthStart = monthStart(reference.getUTCFullYear(), reference.getUTCMonth());

  // Início do período: N-1 meses antes do mês atual.
  const periodStart = new Date(currentMonthStart);
  periodStart.setUTCMonth(periodStart.getUTCMonth() - (periodMonths - 1));

  // Fim do período: início do mês seguinte ao atual (exclusivo).
  const periodEnd = new Date(currentMonthStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const completedTasks = await prisma.task.findMany({
    where: {
      workspace: "LOJA",
      completedAt: { gte: periodStart, lt: periodEnd },
    },
    include: {
      assignee: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { completedAt: "asc" },
  });

  // Monta os N baldes de mês, já na ordem certa, mesmo que algum tenha 0.
  const buckets: { month: string; label: string; count: number }[] = [];
  for (let i = 0; i < periodMonths; i++) {
    const d = new Date(periodStart);
    d.setUTCMonth(d.getUTCMonth() + i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      month: key,
      label: `${MONTH_LABELS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`,
      count: 0,
    });
  }
  const bucketIndex = new Map(buckets.map((b, i) => [b.month, i]));

  const byUserMap = new Map<string, number>();
  const clientMap = new Map<string, number>();
  let totalDurationHours = 0;
  let durationSamples = 0;
  let mostRecentClient: { clientName: string; completedAt: string } | null = null;

  for (const task of completedTasks) {
    const completedAt = task.completedAt as Date;
    const key = `${completedAt.getUTCFullYear()}-${String(completedAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const idx = bucketIndex.get(key);
    if (idx !== undefined) buckets[idx].count++;

    const userName = task.assignee?.name ?? task.owner.name;
    byUserMap.set(userName, (byUserMap.get(userName) ?? 0) + 1);

    if (task.clientName) {
      clientMap.set(task.clientName, (clientMap.get(task.clientName) ?? 0) + 1);
      // completedTasks está ordenado do mais antigo pro mais novo, então a
      // última sobrescrita no final do laço é sempre a mais recente.
      mostRecentClient = { clientName: task.clientName, completedAt: completedAt.toISOString() };
    }

    const hours = (completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) {
      totalDurationHours += hours;
      durationSamples++;
    }
  }

  // "Hoje" e "este mês" contam a partir da mesma lista já carregada acima —
  // sem consulta extra ao banco.
  const todayStart = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate())
  );
  const completedToday = completedTasks.filter(
    (t) => (t.completedAt as Date) >= todayStart
  ).length;
  const completedThisMonth = completedTasks.filter(
    (t) => (t.completedAt as Date) >= currentMonthStart
  ).length;

  const byUser = [...byUserMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topClients = [...clientMap.entries()]
    .map(([clientName, count]) => ({ clientName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    periodMonths,
    monthly: buckets,
    byUser,
    totalCompleted: completedTasks.length,
    completedToday,
    completedThisMonth,
    avgCompletionHours: durationSamples > 0 ? totalDurationHours / durationSamples : null,
    topClients,
    mostRecentClient,
  };
}
