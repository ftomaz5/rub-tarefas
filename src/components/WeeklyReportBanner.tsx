"use client";

import { useEffect, useState } from "react";
import type { WeeklyReportData } from "@/lib/weeklyReport";
import { buildGenericWhatsappLink, buildWeeklyReportWhatsappMessage } from "@/lib/whatsapp";

// Data (AAAA-MM-DD) da segunda-feira desta semana, no fuso do navegador —
// usada como "chave" pra lembrar se a pessoa já fechou o relatório dessa
// semana (não mostra de novo até a próxima segunda).
function mondayKeyForToday(): string {
  const now = new Date();
  const day = now.getDay(); // 0 (dom) .. 6 (sáb)
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

export function WeeklyReportBanner() {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Aparece sozinho só de segunda a quarta-feira — depois disso o resumo
    // fica "velho" e não vale a pena interromper quem abre o app.
    const weekday = new Date().getDay(); // 1 = segunda, 3 = quarta
    if (weekday < 1 || weekday > 3) return;

    const dismissKey = `weekly-report-dismissed-${mondayKeyForToday()}`;
    try {
      if (localStorage.getItem(dismissKey)) return;
    } catch {
      // Sem localStorage (modo privado etc) — segue e mostra mesmo assim.
    }

    fetch("/api/weekly-report")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.report) {
          setReport(data.report);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  function handleClose() {
    setVisible(false);
    try {
      localStorage.setItem(`weekly-report-dismissed-${mondayKeyForToday()}`, "1");
    } catch {
      // Sem problema — só significa que pode aparecer de novo na próxima vez.
    }
  }

  if (!visible || !report) return null;

  const start = new Date(report.weekStart);
  const end = new Date(new Date(report.weekEnd).getTime() - 24 * 60 * 60 * 1000);
  const rangeLabel = `${start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })} a ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;

  const whatsappLink = buildGenericWhatsappLink(
    buildWeeklyReportWhatsappMessage(report, rangeLabel)
  );

  return (
    <div className="mb-5 rounded-xl border border-brand-100 bg-white shadow-premium px-4 py-3 text-sm border-t-2 border-t-gold-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-brand-900 tracking-[-0.01em]">
            📊 Resumo da semana passada ({rangeLabel})
          </p>
          <p className="text-brand-700/80 mt-0.5">
            {report.totalCompleted} tarefa(s) concluída(s)
            {report.overdueCount > 0 && ` · ${report.overdueCount} atrasada(s)`}
            {` · ${report.pendingCount} pendente(s) no momento`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          title="Fechar"
          className="text-slate-400 hover:text-brand-700 text-lg leading-none shrink-0"
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {report.completedByUser.length > 0 && (
            <div>
              <p className="font-semibold text-brand-900 mb-1">Concluídas por pessoa:</p>
              <ul className="space-y-0.5 text-slate-600">
                {report.completedByUser.map((u) => (
                  <li key={u.name}>
                    • {u.name}: {u.count}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.clients.length > 0 && (
            <div>
              <p className="font-semibold text-brand-900 mb-1">Clientes atendidos:</p>
              <ul className="space-y-0.5 text-slate-600">
                {report.clients.map((c, i) => (
                  <li key={`${c.clientName}-${i}`}>• {c.clientName}</li>
                ))}
              </ul>
            </div>
          )}

          {report.completedByUser.length === 0 && report.clients.length === 0 && (
            <p className="text-slate-500">Nenhuma tarefa concluída na semana passada.</p>
          )}

          {report.stock.topSelling.length > 0 && (
            <div>
              <p className="font-semibold text-brand-900 mb-1">🔋 Mais vendidos na semana:</p>
              <ul className="space-y-0.5 text-slate-600">
                {report.stock.topSelling.slice(0, 5).map((p) => (
                  <li key={`top-${p.brand}-${p.amperage}`}>
                    • {p.brand} {p.amperage}Ah: {p.quantitySold} saída(s)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.stock.leastSelling.length > 0 && (
            <div>
              <p className="font-semibold text-brand-900 mb-1">Menos vendidos na semana:</p>
              <ul className="space-y-0.5 text-slate-600">
                {report.stock.leastSelling.slice(0, 5).map((p) => (
                  <li key={`least-${p.brand}-${p.amperage}`}>
                    • {p.brand} {p.amperage}Ah: {p.quantitySold} saída(s)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.stock.byBrand.length > 0 && (
            <div>
              <p className="font-semibold text-brand-900 mb-1">Saídas por marca:</p>
              <ul className="space-y-0.5 text-slate-600">
                {report.stock.byBrand.map((b) => (
                  <li key={`brand-${b.brand}`}>
                    • {b.brand}: {b.quantitySold} unidade(s)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.stock.lowStock.length > 0 && (
            <div>
              <p className="font-semibold text-red-700 mb-1">⚠️ Estoque baixo agora:</p>
              <ul className="space-y-0.5 text-red-700">
                {report.stock.lowStock.map((p) => (
                  <li key={`low-${p.brand}-${p.amperage}`}>
                    • {p.brand} {p.amperage}Ah: {p.quantity} unidade(s) (mínimo {p.minQuantity})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.stock.currentBalances.length > 0 && (
            <div>
              <p className="font-semibold text-brand-900 mb-1">Saldo atual de cada produto:</p>
              <ul className="space-y-0.5 text-slate-600">
                {report.stock.currentBalances.map((p) => (
                  <li key={`bal-${p.brand}-${p.amperage}`}>
                    • {p.brand} {p.amperage}Ah: {p.quantity} unidade(s)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-brand-700 font-semibold hover:underline"
        >
          {expanded ? "Ver menos" : "Ver detalhes"}
        </button>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-premium transition-all"
        >
          📱 Enviar no WhatsApp
        </a>
      </div>
    </div>
  );
}
