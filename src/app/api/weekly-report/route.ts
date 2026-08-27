import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeWeeklyReport } from "@/lib/weeklyReport";

// GET /api/weekly-report
// Usado pelo banner que aparece sozinho no app (segunda a quarta-feira) e
// pelo botão "Enviar no WhatsApp" — sempre calcula na hora, direto das
// tarefas, então nunca fica desatualizado.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const report = await computeWeeklyReport(prisma);

  return NextResponse.json({ report });
}
