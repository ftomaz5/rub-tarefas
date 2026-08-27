import type { PrismaClient } from "@prisma/client";

// Monta o "relatório semanal": o resumo automático que aparece no app (e pode
// ser mandado no WhatsApp) toda segunda-feira, com o que aconteceu na semana
// anterior. Escopo: só tarefas da LOJA (compartilhadas) — tarefas Pessoais
// ficam de fora, já que o relatório é sobre o andamento do negócio.

export interface WeeklyReportData {
  weekStart: string; // segunda-feira 00:00 da semana anterior (ISO)
  weekEnd: string; // segunda-feira 00:00 desta semana (ISO, exclusivo)
  completedByUser: { name: string; count: number }[];
  totalCompleted: number;
  pendingCount: number;
  overdueCount: number;
  clients: { clientName: string; batteryType: string | null; completedAt: string }[];
  stock: WeeklyStockData;
}

export interface WeeklyStockData {
  // Produtos com mais/menos saída (venda) na semana. Só entram produtos que
  // tiveram pelo menos 1 saída — "menos vendido" não é "zero vendido", é o
  // produto que mais precisou de reposição de atenção dentro do que já saiu.
  topSelling: { brand: string; amperage: number; quantitySold: number }[];
  leastSelling: { brand: string; amperage: number; quantitySold: number }[];
  // Saídas da semana somadas por marca.
  byBrand: { brand: string; quantitySold: number }[];
  // Alerta é sobre o saldo ATUAL (agora), não histórico da semana — o que
  // importa pra quem lê o relatório é "o que precisa comprar já".
  lowStock: { brand: string; amperage: number; quantity: number; minQuantity: number }[];
  // Saldo atual de cada produto cadastrado, pro fechamento/consulta rápida.
  currentBalances: { brand: string; amperage: number; quantity: number }[];
}

// Segunda-feira 00:00 da semana anterior até segunda-feira 00:00 desta
// semana. Usa UTC pra manter o mesmo padrão simples já usado no resto do
// app (ex: cron de lembretes) — sem ajuste fino de fuso horário.
export function getLastWeekRange(reference: Date = new Date()): {
  weekStart: Date;
  weekEnd: Date;
} {
  const day = reference.getUTCDay(); // 0 (dom) .. 6 (sáb)
  const diffToMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate() - diffToMonday
    )
  );
  const weekStart = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { weekStart, weekEnd: thisMonday };
}

export async function computeWeeklyReport(
  prisma: PrismaClient,
  reference: Date = new Date()
): Promise<WeeklyReportData> {
  const { weekStart, weekEnd } = getLastWeekRange(reference);

  const completedTasks = await prisma.task.findMany({
    where: {
      workspace: "LOJA",
      completedAt: { gte: weekStart, lt: weekEnd },
    },
    include: {
      assignee: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { completedAt: "asc" },
  });

  const byUser = new Map<string, number>();
  for (const task of completedTasks) {
    const name = task.assignee?.name ?? task.owner.name;
    byUser.set(name, (byUser.get(name) ?? 0) + 1);
  }
  const completedByUser = [...byUser.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const [pendingCount, overdueCount] = await Promise.all([
    prisma.task.count({ where: { workspace: "LOJA", completedAt: null } }),
    prisma.task.count({
      where: { workspace: "LOJA", completedAt: null, dueDate: { lt: reference } },
    }),
  ]);

  const clients = completedTasks
    .filter((task) => task.clientName)
    .map((task) => ({
      clientName: task.clientName as string,
      batteryType: task.batteryType,
      completedAt: (task.completedAt as Date).toISOString(),
    }));

  const stock = await computeWeeklyStockData(prisma, weekStart, weekEnd);

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    completedByUser,
    totalCompleted: completedTasks.length,
    pendingCount,
    overdueCount,
    clients,
    stock,
  };
}

async function computeWeeklyStockData(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyStockData> {
  const [movements, products] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { type: "SAIDA", createdAt: { gte: weekStart, lt: weekEnd } },
      include: { product: { select: { brand: true, amperage: true } } },
    }),
    prisma.product.findMany({ orderBy: [{ brand: "asc" }, { amperage: "asc" }] }),
  ]);

  const byProduct = new Map<string, { brand: string; amperage: number; quantitySold: number }>();
  const byBrandMap = new Map<string, number>();

  for (const m of movements) {
    const key = `${m.product.brand}__${m.product.amperage}`;
    const entry = byProduct.get(key) ?? {
      brand: m.product.brand,
      amperage: m.product.amperage,
      quantitySold: 0,
    };
    entry.quantitySold += m.quantity;
    byProduct.set(key, entry);

    byBrandMap.set(m.product.brand, (byBrandMap.get(m.product.brand) ?? 0) + m.quantity);
  }

  const sold = [...byProduct.values()].sort((a, b) => b.quantitySold - a.quantitySold);
  const topSelling = sold.slice(0, 5);
  const leastSelling = [...sold].reverse().slice(0, 5);

  const byBrand = [...byBrandMap.entries()]
    .map(([brand, quantitySold]) => ({ brand, quantitySold }))
    .sort((a, b) => b.quantitySold - a.quantitySold);

  const lowStock = products
    .filter((p) => p.minQuantity !== null && p.quantity <= p.minQuantity)
    .map((p) => ({
      brand: p.brand,
      amperage: p.amperage,
      quantity: p.quantity,
      minQuantity: p.minQuantity as number,
    }));

  const currentBalances = products.map((p) => ({
    brand: p.brand,
    amperage: p.amperage,
    quantity: p.quantity,
  }));

  return { topSelling, leastSelling, byBrand, lowStock, currentBalances };
}
