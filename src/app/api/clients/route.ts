import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/clients
// Lista os nomes de cliente já usados em alguma tarefa da Loja (concluída ou
// não). Usado pra sugerir/autocompletar o nome ao criar uma tarefa nova, pra
// evitar o mesmo cliente entrar duas vezes com grafia diferente (ex:
// "Furlan" e "Furlan Silva" contando como pessoas diferentes no painel).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rows = await prisma.task.findMany({
    where: { workspace: "LOJA", clientName: { not: null } },
    select: { clientName: true },
    distinct: ["clientName"],
  });

  const clients = rows
    .map((r) => r.clientName as string)
    .filter((name) => name.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return NextResponse.json({ clients });
}
