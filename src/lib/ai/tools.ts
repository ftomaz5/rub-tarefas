import type { FunctionDeclaration } from "@google/genai";

// Declarações das ferramentas que o assistente pode usar pra consultar dados
// reais da loja. Cada uma tem seu executor correspondente em toolExecutors.ts,
// ligado pelo "name". NUNCA adicionar aqui uma ferramenta que apague ou
// altere dados — leitura apenas, mais a proposta (sem escrita) de criar
// tarefa. Essa lista é o limite de segurança: o modelo só pode fazer o que
// está declarado aqui, então uma ferramenta de escrita nunca deve existir
// nesse arquivo.
export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "getDashboardStats",
    description:
      "Retorna estatísticas gerais da loja: tarefas concluídas hoje/mês/período de 6 meses, ranking de funcionários, clientes mais recorrentes, produtos mais vendidos, ranking de vendas por marca e alertas de estoque baixo. Use para perguntas gerais tipo 'como estamos indo' ou 'quantas tarefas concluí esse mês'.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "searchTasks",
    description:
      "Busca tarefas específicas por nome de cliente, status, workspace (loja ou pessoal) ou se estão atrasadas. Use para perguntas sobre um cliente específico ou sobre tarefas atrasadas/pendentes.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        clientName: {
          type: "string",
          description: "Nome ou parte do nome do cliente para buscar",
        },
        status: {
          type: "string",
          enum: ["A_FAZER", "FAZENDO", "FEITO"],
          description: "Filtra por status da tarefa",
        },
        workspace: {
          type: "string",
          enum: ["PESSOAL", "LOJA"],
          description: "Filtra pelo espaço de tarefas (padrão: LOJA)",
        },
        onlyOverdue: {
          type: "boolean",
          description: "Se true, retorna só tarefas atrasadas (prazo já passou e não concluídas)",
        },
      },
    },
  },
  {
    name: "getProductStock",
    description:
      "Consulta o estoque atual de produtos (baterias), opcionalmente filtrando por marca. Marcas vendidas pela loja: IMPAR, UNICA, BATS, HELIAR, EXCELL. Use para perguntas sobre saldo em estoque de um produto específico.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        brand: {
          type: "string",
          description: "Marca do produto para filtrar (ex: BATS, HELIAR)",
        },
        onlyLowStock: {
          type: "boolean",
          description: "Se true, retorna só produtos com estoque baixo (abaixo do mínimo configurado)",
        },
      },
    },
  },
  {
    name: "getStockMovements",
    description:
      "Resumo de vendas (saídas) ou entradas de estoque num período de tempo, opcionalmente filtrado por marca. Use para perguntas tipo 'quantas baterias BATS vendi esse mês'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Marca do produto para filtrar" },
        type: {
          type: "string",
          enum: ["ENTRADA", "SAIDA"],
          description: "Tipo de movimento (padrão: SAIDA, ou seja, vendas)",
        },
        period: {
          type: "string",
          enum: ["today", "this_week", "this_month"],
          description: "Período de tempo a considerar",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "proposeCreateTask",
    description:
      "Monta uma PROPOSTA de nova tarefa a partir do pedido do usuário. NÃO cria a tarefa de verdade — só retorna os dados para o usuário confirmar na tela antes de salvar. Nunca diga ao usuário que a tarefa foi criada quando usar essa ferramenta; diga que a proposta está pronta para confirmação.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título curto da tarefa" },
        clientName: { type: "string" },
        clientPhone: { type: "string" },
        batteryType: {
          type: "string",
          enum: ["IMPAR", "UNICA", "BATS", "HELIAR", "EXCELL", "OUTRAS"],
        },
        dueDateDescription: {
          type: "string",
          description:
            "Descrição em texto de quando a tarefa deve ser feita, exatamente como o usuário disse (ex: 'amanhã', 'sexta-feira', 'semana que vem') — NÃO calcule a data você mesmo, apenas repasse a descrição textual.",
        },
        priority: { type: "string", enum: ["BAIXA", "MEDIA", "ALTA"] },
        workspace: { type: "string", enum: ["PESSOAL", "LOJA"] },
      },
      required: ["title", "workspace"],
    },
  },
];
