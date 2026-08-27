import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockMovementSchema } from "@/lib/validation";

// GET /api/products/:id/movements
// Histórico de movimentações de um produto, mais recente primeiro.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const movements = await prisma.stockMovement.findMany({
    where: { productId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ movements });
}

// POST /api/products/:id/movements
// Registra uma entrada ou saída e atualiza o saldo do produto — tudo numa
// transação só, pra nunca ficar com o histórico e o saldo dessincronizados.
// Qualquer funcionário logado pode registrar (decisão confirmada com o Flávio).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = stockMovementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { type, quantity, note } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new Error("PRODUTO_NAO_ENCONTRADO");
      }

      const delta = type === "ENTRADA" ? quantity : -quantity;
      const nextQuantity = product.quantity + delta;

      if (nextQuantity < 0) {
        throw new Error("ESTOQUE_INSUFICIENTE");
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: { quantity: nextQuantity },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: id,
          type,
          quantity,
          note: note ?? undefined,
          userId: session.user.id,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      return { product: updatedProduct, movement };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "PRODUTO_NAO_ENCONTRADO") {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "ESTOQUE_INSUFICIENTE") {
      return NextResponse.json(
        { error: "Estoque insuficiente para essa saída" },
        { status: 400 }
      );
    }
    throw err;
  }
}
