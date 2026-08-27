// Monta o link "wa.me" que abre o WhatsApp (app no celular, ou site no
// computador) já com o número e a mensagem preenchidos. Não é envio
// automático — quem clicar ainda precisa apertar "Enviar" dentro do
// WhatsApp. É o jeito gratuito de fazer isso: a API oficial que manda
// mensagem sozinha, sem a pessoa clicar, é paga.

// Limpa o número e garante o código do Brasil (55) na frente, do jeito que
// o wa.me exige (só dígitos, com DDI).
export function normalizePhoneForWhatsapp(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 10) return null; // muito curto pra ser um telefone válido

  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }
  return `55${digits}`;
}

export function buildTaskWhatsappMessage(task: {
  title: string;
  description?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  dueDate?: string | null;
}): string {
  const lines: string[] = [`📋 *${task.title}*`];

  if (task.clientName) lines.push(`👤 Cliente: ${task.clientName}`);
  if (task.clientPhone) lines.push(`📞 Tel. cliente: ${task.clientPhone}`);
  if (task.clientAddress) lines.push(`📍 Endereço: ${task.clientAddress}`);

  if (task.dueDate) {
    const d = new Date(task.dueDate);
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
    const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const timeStr = hasTime
      ? ` às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "";
    lines.push(`🗓️ Prazo: ${dateStr}${timeStr}`);
  }

  if (task.description) lines.push("", task.description);

  lines.push("", "— Enviado pelo RUB Tarefas");

  return lines.join("\n");
}

export function buildWhatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Link do WhatsApp sem número fixo: abre o WhatsApp já com a mensagem
// pronta e deixa a pessoa escolher pra quem mandar (contato ou grupo).
// Usado no relatório semanal, que não tem "um" destinatário certo.
export function buildGenericWhatsappLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildWeeklyReportWhatsappMessage(
  report: {
    totalCompleted: number;
    pendingCount: number;
    overdueCount: number;
    completedByUser: { name: string; count: number }[];
    clients: { clientName: string }[];
    stock: {
      topSelling: { brand: string; amperage: number; quantitySold: number }[];
      leastSelling: { brand: string; amperage: number; quantitySold: number }[];
      byBrand: { brand: string; quantitySold: number }[];
      lowStock: { brand: string; amperage: number; quantity: number; minQuantity: number }[];
    };
  },
  rangeLabel: string
): string {
  const lines: string[] = [`📊 *Resumo da semana (${rangeLabel})*`, ""];

  lines.push(`✅ ${report.totalCompleted} tarefa(s) concluída(s)`);
  for (const u of report.completedByUser) {
    lines.push(`   • ${u.name}: ${u.count}`);
  }

  lines.push(`📌 ${report.pendingCount} pendente(s) no momento`);
  if (report.overdueCount > 0) {
    lines.push(`⚠️ ${report.overdueCount} atrasada(s)`);
  }

  if (report.clients.length > 0) {
    lines.push("", "Clientes atendidos:");
    for (const c of report.clients) {
      lines.push(`   • ${c.clientName}`);
    }
  }

  if (report.stock.topSelling.length > 0) {
    lines.push("", "🔋 Estoque da semana:");
    lines.push("Mais vendidos:");
    for (const p of report.stock.topSelling.slice(0, 3)) {
      lines.push(`   • ${p.brand} ${p.amperage}Ah: ${p.quantitySold} saída(s)`);
    }
    if (report.stock.leastSelling.length > 0) {
      lines.push("Menos vendidos:");
      for (const p of report.stock.leastSelling.slice(0, 3)) {
        lines.push(`   • ${p.brand} ${p.amperage}Ah: ${p.quantitySold} saída(s)`);
      }
    }
  }

  if (report.stock.lowStock.length > 0) {
    lines.push("", "⚠️ Estoque baixo agora:");
    for (const p of report.stock.lowStock) {
      lines.push(`   • ${p.brand} ${p.amperage}Ah: ${p.quantity} unidade(s)`);
    }
  }

  lines.push("", "— Enviado pelo RUB Tarefas");

  return lines.join("\n");
}
