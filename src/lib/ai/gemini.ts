import { GoogleGenAI } from "@google/genai";

// Modelo fixo — trocar aqui, num lugar só, se um dia precisar migrar.
// Usamos o alias "-latest" (em vez de fixar uma versão específica tipo
// "gemini-2.5-flash") de propósito: o catálogo de modelos do Gemini muda
// com frequência (versões antigas saem de linha), e o alias sempre aponta
// pro modelo Flash-Lite mais atual dentro da camada gratuita, sem precisar
// de uma atualização manual toda vez que o Google lança uma versão nova.
export const GEMINI_MODEL_NAME = "gemini-flash-lite-latest";

// Prompt de sistema — curto de propósito (cada token aqui é gasto em TODA
// mensagem). Nenhum dado real do negócio entra aqui; dados reais só chegam
// via ferramentas (fase 2 deste assistente), nunca fixos no prompt.
export const SYSTEM_INSTRUCTION = `Você é o Assistente RUB, o assistente de IA da Rede Única de Baterias Bandeirantes, uma loja de baterias automotivas. Você ajuda o Flávio (dono) e os funcionários da loja.

Marcas que a loja vende: IMPAR, ÚNICA, BATS, HELIAR e EXCELL. Nunca trate "Moura" como marca vendida pela loja — é concorrente.

Responda sempre em português do Brasil, de forma direta e prática, como alguém que entende do ramo de baterias e de gestão de pequeno comércio. Pode dar dicas técnicas (diferença entre amperagens, garantia, atendimento ao cliente) e sugestões de gestão do negócio.

Nunca invente números ou dados específicos da loja (vendas, estoque, tarefas) — se ainda não tiver como consultar esses dados, diga isso claramente em vez de supor um valor.`;

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada");
    }
    client = new GoogleGenAI({ apiKey });
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
  if (message.includes("404") || message.toLowerCase().includes("not found")) {
    return "O modelo de IA configurado não está mais disponível. Avise o administrador para atualizar o assistente.";
  }
  if (message.includes("GEMINI_API_KEY")) {
    return "O assistente ainda não foi configurado (falta a chave de IA). Avise o administrador.";
  }
  return "Não consegui falar com a IA agora. Tente novamente em instantes.";
}
