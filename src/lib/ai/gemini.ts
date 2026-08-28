import { GoogleGenerativeAI } from "@google/generative-ai";

// Modelo fixo — trocar aqui, num lugar só, se um dia precisar migrar
// (ex: se o gemini-1.5-flash sair da camada gratuita). Não usar gemini-1.5-pro:
// o limite gratuito diário dele é bem menor (50/dia) e arriscado demais mesmo
// pro volume baixo de uma loja pequena.
export const GEMINI_MODEL_NAME = "gemini-1.5-flash";

// Prompt de sistema — curto de propósito (cada token aqui é gasto em TODA
// mensagem). Nenhum dado real do negócio entra aqui; dados reais só chegam
// via ferramentas (fase 2 deste assistente), nunca fixos no prompt.
export const SYSTEM_INSTRUCTION = `Você é o Assistente RUB, o assistente de IA da Rede Única de Baterias Bandeirantes, uma loja de baterias automotivas. Você ajuda o Flávio (dono) e os funcionários da loja.

Marcas que a loja vende: IMPAR, ÚNICA, BATS, HELIAR e EXCELL. Nunca trate "Moura" como marca vendida pela loja — é concorrente.

Responda sempre em português do Brasil, de forma direta e prática, como alguém que entende do ramo de baterias e de gestão de pequeno comércio. Pode dar dicas técnicas (diferença entre amperagens, garantia, atendimento ao cliente) e sugestões de gestão do negócio.

Nunca invente números ou dados específicos da loja (vendas, estoque, tarefas) — se ainda não tiver como consultar esses dados, diga isso claramente em vez de supor um valor.`;

let client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada");
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

// Erro "amigável" já em português, pra rota da API só precisar repassar pro
// usuário sem se preocupar em traduzir mensagens técnicas do Gemini.
export function friendlyGeminiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "O assistente está com muitas perguntas no momento (limite gratuito da IA). Tente novamente em alguns minutos.";
  }
  if (message.includes("GEMINI_API_KEY")) {
    return "O assistente ainda não foi configurado (falta a chave de IA). Avise o administrador.";
  }
  return "Não consegui falar com a IA agora. Tente novamente em instantes.";
}
