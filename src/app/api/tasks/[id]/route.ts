import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskUpdateSchema } from "@/lib/validation";

async function canEdit(userId: string, userRole: string, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { allowed: false, task: null };

  // Tarefa pessoal: só o dono mexe
  if (task.workspace === "PESSOAL") {
    return { allowed: task.ownerId === userId, task };
  }

  // Tarefa da loja: qualquer funcionário autenticado pode mover/editar,
  // mas só ADMIN ou o dono pode excluir (checado separadamente na rota DELETE)
  return { allowed: true, task };
}

// PATCH /api/tasks/:id
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = taskUpdateSchema.safeParse({ ...body, id });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { allowed, task } = await canEdit(
    session.user.id,
    session.user.role,
    id
  );

  if (!task) {
    return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { title, description, status, priority, dueDate, assigneeId, position, completed } =
    parsed.data;

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(assigneeId !== undefined && task.workspace === "LOJA"
        ? { assigneeId }
        : {}),
      ...(position !== undefined ? { position } : {}),
      ...(completed !== undefined
        ? {
            completedAt: completed ? new Date() : null,
            status: completed ? "FEITO" : status ?? task.status,
          }
        : {}),
    },
    include: {
      owner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ task: updated });
}

// DELETE /api/tasks/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) {
    return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  const isOwner = task.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
