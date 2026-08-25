export type Status = "A_FAZER" | "FAZENDO" | "FEITO";
export type Priority = "BAIXA" | "MEDIA" | "ALTA";
export type Workspace = "PESSOAL" | "LOJA";

export interface TaskUser {
  id: string;
  name: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  workspace: Workspace;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  owner: TaskUser;
  assignee: TaskUser | null;
}

export const STATUS_LABELS: Record<Status, string> = {
  A_FAZER: "A Fazer",
  FAZENDO: "Fazendo",
  FEITO: "Feito",
};

export const STATUS_ORDER: Status[] = ["A_FAZER", "FAZENDO", "FEITO"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  BAIXA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-amber-100 text-amber-700",
  ALTA: "bg-red-100 text-red-700",
};
