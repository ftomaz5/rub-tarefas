import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo").max(80),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
  // WhatsApp opcional — usado pelo botão "Enviar tarefa no WhatsApp".
  phone: z.string().max(20).optional().nullable(),
  // Código simples que a loja usa para permitir novos cadastros de funcionários.
  // Definido via variável de ambiente STORE_INVITE_CODE.
  inviteCode: z.string().min(1, "Informe o código de convite da loja"),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(2000).optional().nullable(),
  workspace: z.enum(["PESSOAL", "LOJA"]),
  status: z.enum(["A_FAZER", "FAZENDO", "FEITO"]).optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  clientName: z.string().max(120).optional().nullable(),
  clientPhone: z.string().max(30).optional().nullable(),
  clientAddress: z.string().max(300).optional().nullable(),
  batteryType: z.enum(["IMPAR", "UNICA", "BATS", "OUTRAS"]).optional().nullable(),
  warrantyPhotoUrl: z.string().url().max(500).optional().nullable(),
});

export const taskUpdateSchema = taskSchema.partial().extend({
  id: z.string(),
  position: z.number().optional(),
  completed: z.boolean().optional(), // true = marca como concluída (sai da tela principal); false = reabre
});

// ---------- Estoque ----------

export const productSchema = z.object({
  brand: z.string().min(1, "Informe a marca").max(60),
  amperage: z.number().int("Amperagem precisa ser um número inteiro").positive("Amperagem precisa ser maior que zero"),
  quantity: z.number().int().min(0).optional(), // quantidade inicial ao cadastrar (padrão 0)
  minQuantity: z.number().int().min(0).optional().nullable(), // mínimo pro alerta de estoque baixo
});

export const productUpdateSchema = z.object({
  brand: z.string().min(1).max(60).optional(),
  amperage: z.number().int().positive().optional(),
  minQuantity: z.number().int().min(0).optional().nullable(),
});

export const stockMovementSchema = z.object({
  type: z.enum(["ENTRADA", "SAIDA"]),
  quantity: z.number().int().positive("Quantidade precisa ser maior que zero"),
  note: z.string().max(200).optional().nullable(),
});
