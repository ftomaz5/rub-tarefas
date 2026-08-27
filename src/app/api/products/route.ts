import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validation";

// GET /api/products
// Lista todos os produtos, ordenados por marca e depois amperagem.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    orderBy: [{ brand: "asc" }, { amperage: "asc" }],
  });

  return NextResponse.json({ products });
}

// POST /api/products
// Cadastra um produto novo (marca + amperagem). Qualquer funcionário logado
// pode cadastrar — mantém o "fácil de cadastrar" pra qualquer um da loja.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { brand_amperage: { brand: data.brand, amperage: data.amperage } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Já existe um produto ${data.brand} ${data.amperage}Ah cadastrado` },
      { status: 400 }
    );
  }

  const initialQuantity = data.quantity ?? 0;

  const product = await prisma.product.create({
    data: {
      brand: data.brand,
      amperage: data.amperage,
      quantity: initialQuantity,
      minQuantity: data.minQuantity ?? undefined,
    },
  });

  // Se cadastrou já com quantidade inicial, registra como uma entrada no
  // histórico — assim o saldo inicial também aparece no relatório/painel.
  if (initialQuantity > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: "ENTRADA",
        quantity: initialQuantity,
        note: "Estoque inicial (cadastro do produto)",
        userId: session.user.id,
      },
    });
  }

  return NextResponse.json({ product }, { status: 201 });
}
