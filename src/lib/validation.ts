import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo").max(80),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
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
});

export const taskUpdateSchema = taskSchema.partial().extend({
  id: z.string(),
  position: z.number().optional(),
  completed: z.boolean().optional(), // true = marca como concluída (sai da tela principal); false = reabre
});
