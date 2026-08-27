import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validation";

// PATCH /api/products/:id
// Edita marca/amperagem/mínimo do produto. Não mexe em quantidade — isso é
// feito só via /api/products/:id/movements, pra manter o histórico consistente.
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
  const parsed = productUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const { brand, amperage, minQuantity } = parsed.data;

  if (brand !== undefined || amperage !== undefined) {
    const nextBrand = brand ?? product.brand;
    const nextAmperage = amperage ?? product.amperage;
    const conflict = await prisma.product.findUnique({
      where: { brand_amperage: { brand: nextBrand, amperage: nextAmperage } },
    });
    if (conflict && conflict.id !== id) {
      return NextResponse.json(
        { error: `Já existe um produto ${nextBrand} ${nextAmperage}Ah cadastrado` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(brand !== undefined ? { brand } : {}),
      ...(amperage !== undefined ? { amperage } : {}),
      ...(minQuantity !== undefined ? { minQuantity } : {}),
    },
  });

  return NextResponse.json({ product: updated });
}

// DELETE /api/products/:id
// Só ADMIN pode excluir — evita perder histórico de movimentações por engano.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Só o administrador pode excluir produtos" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
