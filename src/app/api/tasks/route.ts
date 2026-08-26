import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validation";

// GET /api/tasks?workspace=LOJA|PESSOAL
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspace = searchParams.get("workspace");
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  const tasks = await prisma.task.findMany({
    where: {
      ...(workspace === "PESSOAL"
        ? { workspace: "PESSOAL", ownerId: session.user.id }
        : { workspace: "LOJA" }),
      ...(includeCompleted ? {} : { completedAt: null }),
    },
    include: {
      owner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: includeCompleted
      ? [{ completedAt: "desc" }]
      : [{ status: "asc" }, { position: "asc" }],
  });

  return NextResponse.json({ tasks });
}

// POST /api/tasks
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Tarefas pessoais só podem pertencer a quem as criou
  if (data.workspace === "PESSOAL" && data.assigneeId) {
    return NextResponse.json(
      { error: "Tarefas pessoais não podem ser atribuídas a outra pessoa" },
      { status: 400 }
    );
  }

  // Posição: última da coluna A_FAZER
  const last = await prisma.task.findFirst({
    where: { workspace: data.workspace, status: "A_FAZER" },
    orderBy: { position: "desc" },
  });

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? undefined,
      workspace: data.workspace,
      status: "A_FAZER",
      priority: data.priority ?? "MEDIA",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      ownerId: session.user.id,
      assigneeId: data.workspace === "LOJA" ? data.assigneeId ?? undefined : undefined,
      position: (last?.position ?? -1) + 1,
      clientName: data.clientName ?? undefined,
      clientPhone: data.clientPhone ?? undefined,
      clientAddress: data.clientAddress ?? undefined,
      batteryType: data.batteryType ?? undefined,
      warrantyPhotoUrl: data.warrantyPhotoUrl ?? undefined,
    },
    include: {
      owner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
