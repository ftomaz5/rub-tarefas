import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { name, email, password, phone, inviteCode } = parsed.data;

  const expectedCode = process.env.STORE_INVITE_CODE;
  if (!expectedCode || inviteCode !== expectedCode) {
    return NextResponse.json(
      { error: "Código de convite inválido" },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma conta com esse e-mail" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // O primeiro usuário cadastrado no sistema vira ADMIN automaticamente
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "ADMIN" : "FUNCIONARIO";

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, phone: phone?.trim() || undefined },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
