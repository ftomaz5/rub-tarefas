import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDashboardStats } from "@/lib/dashboardStats";

// GET /api/dashboard
// Dados do painel de indicadores — qualquer funcionário logado pode ver
// (mesmo acesso que o quadro de tarefas da loja, que já é compartilhado).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const data = await computeDashboardStats(prisma);

  return NextResponse.json({ dashboard: data });
}
