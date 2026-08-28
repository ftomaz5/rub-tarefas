import { prisma } from "@/lib/prisma";
import { computeDashboardStats } from "@/lib/dashboardStats";

// Implementações das ferramentas declaradas em tools.ts. Cada função recebe
// os argumentos que o Gemini decidiu mandar (não confiar cegamente — sempre
// tratar como possivelmente incompleto/errado) e o contexto do usuário
// logado (pra escopo de tarefas PESSOAL). IMPORTANTE: nenhuma função aqui
// pode escrever no banco — isso é o mesmo limite de segurança descrito em
// tools.ts, só que do lado da implementação.

interface ToolContext {
  userId: string;
}

// ---------- getDashboardStats ----------
async function getDashboardStats() {
  const stats = await computeDashboardStats(prisma);
  return stats;
}

// ---------- searchTasks ----------
// Replica exatamente o escopo de PESSOAL/LOJA usado em GET /api/tasks (só
// que sem o filtro de 30 dias — aqui é uma busca, não o quadro do dia a dia).
interface SearchTasksArgs {
  clientName?: string;
  status?: "A_FAZER" | "FAZENDO" | "FEITO";
  workspace?: "PESSOAL" | "LOJA";
  onlyOverdue?: boolean;
}

async function searchTasks(args: SearchTasksArgs, ctx: ToolContext) {
  const workspace = args.workspace === "PESSOAL" ? "PESSOAL" : "LOJA";
  const now = new Date();

  const where: Record<string, unknown> = {
    ...(workspace === "PESSOAL"
      ? { workspace: "PESSOAL", ownerId: ctx.userId }
      : { workspace: "LOJA" }),
  };

  if (args.status) {
    where.status = args.status;
  }

  if (args.clientName) {
    where.clientName = { contains: args.clientName, mode: "insensitive" };
  }

  if (args.onlyOverdue) {
    where.status = { not: "FEITO" };
    where.dueDate = { lt: now };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      owner: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  });

  // Manda só o essencial pro modelo — não precisa de ids internos, posição
  // no quadro, etc.
  return {
    count: tasks.length,
    tasks: tasks.map((t: (typeof tasks)[number]) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      clientName: t.clientName,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      assignee: t.assignee?.name ?? null,
      owner: t.owner?.name ?? null,
    })),
  };
}

// ---------- getProductStock ----------
interface GetProductStockArgs {
  brand?: string;
  onlyLowStock?: boolean;
}

async function getProductStock(args: GetProductStockArgs) {
  const where: Record<string, unknown> = {};

  if (args.brand) {
    where.brand = { equals: args.brand, mode: "insensitive" };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ brand: "asc" }, { amperage: "asc" }],
  });

  const filtered = args.onlyLowStock
    ? products.filter(
        (p: (typeof products)[number]) => p.minQuantity !== null && p.quantity <= p.minQuantity
      )
    : products;

  return {
    count: filtered.length,
    products: filtered.map((p: (typeof products)[number]) => ({
      brand: p.brand,
      amperage: p.amperage,
      quantity: p.quantity,
      minQuantity: p.minQuantity,
    })),
  };
}

// ---------- getStockMovements ----------
interface GetStockMovementsArgs {
  brand?: string;
  type?: "ENTRADA" | "SAIDA";
  period: "today" | "this_week" | "this_month";
}

function periodStart(period: GetStockMovementsArgs["period"]): Date {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "this_week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Domingo como início da semana (0 = domingo)
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  // this_month
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getStockMovements(args: Partial<GetStockMovementsArgs>) {
  const type = args.type ?? "SAIDA";
  const period = args.period ?? "this_month";
  const since = periodStart(period);

  const movements = await prisma.stockMovement.findMany({
    where: {
      type,
      createdAt: { gte: since },
      ...(args.brand
        ? { product: { brand: { equals: args.brand, mode: "insensitive" } } }
        : {}),
    },
    include: { product: { select: { brand: true, amperage: true } } },
  });

  // Agrupa por marca+amperagem pra dar um resumo, não uma lista crua
  const byProduct = new Map<string, { brand: string; amperage: number; total: number }>();
  for (const m of movements) {
    const key = `${m.product.brand}|${m.product.amperage}`;
    const existing = byProduct.get(key);
    if (existing) {
      existing.total += m.quantity;
    } else {
      byProduct.set(key, {
        brand: m.product.brand,
        amperage: m.product.amperage,
        total: m.quantity,
      });
    }
  }

  const summary = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
  const totalQuantity = summary.reduce((sum, p) => sum + p.total, 0);

  return {
    type,
    period,
    totalQuantity,
    byProduct: summary,
  };
}

// ---------- proposeCreateTask ----------
// NÃO toca no Prisma. Só valida/normaliza o que o modelo mandou e devolve
// como uma proposta — a confirmação e a escrita de verdade ficam para uma
// fase futura (tela de confirmação + rota própria).
interface ProposeCreateTaskArgs {
  title: string;
  clientName?: string;
  clientPhone?: string;
  batteryType?: "IMPAR" | "UNICA" | "BATS" | "HELIAR" | "EXCELL" | "OUTRAS";
  dueDateDescription?: string;
  priority?: "BAIXA" | "MEDIA" | "ALTA";
  workspace: "PESSOAL" | "LOJA";
}

async function proposeCreateTask(args: Partial<ProposeCreateTaskArgs>) {
  // O schema já marca title/workspace como obrigatórios, mas o modelo pode
  // falhar em respeitar isso — nunca confiar cegamente no que vem da IA.
  if (!args.title || !args.workspace) {
    return {
      proposal: false,
      error: "Faltam dados obrigatórios (título e/ou espaço) para montar a proposta de tarefa.",
    };
  }

  return {
    proposal: true,
    status: "aguardando_confirmacao",
    note: "Essa é apenas uma proposta. A tarefa ainda NÃO foi criada — funcionalidade de confirmação ainda não está disponível nesta versão do assistente.",
    task: {
      title: args.title,
      clientName: args.clientName ?? null,
      clientPhone: args.clientPhone ?? null,
      batteryType: args.batteryType ?? null,
      dueDateDescription: args.dueDateDescription ?? null,
      priority: args.priority ?? "MEDIA",
      workspace: args.workspace,
    },
  };
}

// ---------- despachante ----------
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<object> {
  switch (name) {
    case "getDashboardStats":
      return getDashboardStats();
    case "searchTasks":
      return searchTasks(args as SearchTasksArgs, ctx);
    case "getProductStock":
      return getProductStock(args as GetProductStockArgs);
    case "getStockMovements":
      return getStockMovements(args as Partial<GetStockMovementsArgs>);
    case "proposeCreateTask":
      return proposeCreateTask(args as Partial<ProposeCreateTaskArgs>);
    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}
