import { NextResponse } from "next/server";
import { createPartFromFunctionResponse } from "@google/genai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assistantMessageSchema } from "@/lib/validation";
import {
  getGeminiClient,
  GEMINI_MODEL_NAME,
  SYSTEM_INSTRUCTION,
  friendlyGeminiError,
} from "@/lib/ai/gemini";
import { toolDeclarations } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/toolExecutors";

// Limite de idas e vindas de chamada de ferramenta num único turno — evita
// loop infinito e mantém a resposta dentro do timeout do Vercel Hobby (~10s).
const MAX_TOOL_ITERATIONS = 4;

// Quantas mensagens recentes mandar de volta pro Gemini como histórico.
// Suficiente pra manter o contexto de uma conversa normal sem gastar tokens
// à toa — conversas antigas simplesmente saem da "memória" do assistente,
// mas continuam salvas e visíveis na tela.
const HISTORY_LIMIT = 10;

// GET /api/assistant — carrega o histórico salvo (pra tela não começar vazia
// toda vez que a página é recarregada)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const messages = await prisma.aiMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ messages });
}

// POST /api/assistant — envia uma pergunta e recebe a resposta do assistente
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = assistantMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { message } = parsed.data;
  const userId = session.user.id;

  // Salva a mensagem do usuário já de cara, mesmo antes de saber se a IA vai
  // responder direito — assim a conversa não perde essa mensagem se algo falhar.
  await prisma.aiMessage.create({
    data: { userId, role: "USER", content: message },
  });

  // Histórico recente pra dar contexto pro Gemini (não manda a mensagem que
  // acabou de ser salva agora — essa vai como a mensagem atual do turno).
  const recent = await prisma.aiMessage.findMany({
    where: { userId, role: { in: ["USER", "MODEL"] } },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT + 1, // +1 porque a última é a que acabou de ser salva
  });
  const history = recent
    .slice(1) // remove a mensagem atual (já vai separada abaixo)
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role === "USER" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    }));

  // Tempo máximo interno, com folga em relação ao limite do Vercel Hobby
  // (~10s), pra sempre conseguir responder algo em vez de deixar a
  // plataforma matar a função sem aviso nenhum pro usuário.
  const timeoutMs = 8500;

  const deadline = Date.now() + timeoutMs;

  try {
    const genAI = getGeminiClient();
    const chat = genAI.chats.create({
      model: GEMINI_MODEL_NAME,
      history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    function timeLeft(): number {
      const left = deadline - Date.now();
      if (left <= 0) throw new Error("timeout");
      return left;
    }

    let result = await Promise.race([
      chat.sendMessage({ message }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeLeft())
      ),
    ]);

    // Loop de chamada de ferramentas: enquanto o Gemini pedir pra rodar
    // alguma ferramenta, executa (só leitura, ou a proposta sem escrita) e
    // manda o resultado de volta, até ele responder com texto final ou o
    // limite de iterações/tempo ser atingido.
    let iterations = 0;
    while (result.functionCalls && result.functionCalls.length > 0 && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const responseParts = [];
      for (const call of result.functionCalls) {
        const toolName = call.name ?? "";
        const toolArgs = (call.args ?? {}) as Record<string, unknown>;
        const toolResult = await executeTool(toolName, toolArgs, { userId });

        await prisma.aiMessage.create({
          data: {
            userId,
            role: "TOOL",
            content: `[ferramenta: ${toolName}]`,
            toolName,
            toolArgs,
            toolResult: toolResult as object,
          },
        });

        responseParts.push(
          createPartFromFunctionResponse(
            call.id ?? toolName,
            toolName,
            toolResult as Record<string, unknown>
          )
        );
      }

      result = await Promise.race([
        chat.sendMessage({ message: responseParts }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeLeft())
        ),
      ]);
    }

    const text = result.text ?? "";

    await prisma.aiMessage.create({
      data: { userId, role: "MODEL", content: text },
    });

    return NextResponse.json({ type: "text", text });
  } catch (error) {
    const isTimeout = error instanceof Error && error.message === "timeout";
    const friendly = isTimeout
      ? "Essa pergunta demorou demais para responder — tente ser mais específico."
      : friendlyGeminiError(error);

    // Salva a falha também, como mensagem do assistente, pra conversa
    // continuar fazendo sentido em uma próxima visita à tela.
    await prisma.aiMessage.create({
      data: { userId, role: "MODEL", content: friendly },
    });

    return NextResponse.json({ type: "text", text: friendly });
  }
}

// DELETE /api/assistant — limpa toda a conversa do usuário logado
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await prisma.aiMessage.deleteMany({ where: { userId: session.user.id } });

  return NextResponse.json({ ok: true });
}
