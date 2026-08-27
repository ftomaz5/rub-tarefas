"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/dashboardStats";

// Painel de indicadores da loja (últimos 6 meses). Gráficos em SVG simples,
// sem biblioteca externa — mantém o app leve, do mesmo jeito que o resto do
// projeto. Cor única (azul da marca) em todos os gráficos: cada um mostra só
// uma métrica, então não há necessidade de legenda nem de distinguir séries.

const BAR_COLOR = "#122d76"; // brand-600
const GRID_COLOR = "#e2e8f0"; // slate-200
const AXIS_TEXT = "#94a3b8"; // slate-400

// Arredonda o topo do eixo pra um número "redondo" (1/2/5/10/20/50...), pra
// as linhas de grade ficarem em valores fáceis de ler.
function niceCeil(n: number): number {
  if (n <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const residual = n / magnitude;
  let niceResidual: number;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex-1 min-w-[160px]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-brand-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MonthlyBarChart({ data }: { data: DashboardData["monthly"] }) {
  const width = 640;
  const height = 220;
  const padLeft = 32;
  const padBottom = 24;
  const padTop = 16;
  const innerWidth = width - padLeft - 8;
  const innerHeight = height - padTop - padBottom;

  const maxCount = Math.max(...data.map((d) => d.count), 0);
  const axisMax = niceCeil(maxCount);
  const gap = 10;
  const slot = innerWidth / data.length;
  const barWidth = Math.min(24, slot - gap);

  const yFor = (count: number) => padTop + innerHeight - (count / axisMax) * innerHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Tarefas concluídas por mês">
      {/* Linhas de grade horizontais */}
      {[0, axisMax / 2, axisMax].map((tick, i) => (
        <g key={i}>
          <line
            x1={padLeft}
            x2={width}
            y1={yFor(tick)}
            y2={yFor(tick)}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
          <text x={padLeft - 6} y={yFor(tick) + 3} textAnchor="end" fontSize={10} fill={AXIS_TEXT}>
            {Math.round(tick)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = padLeft + i * slot + (slot - barWidth) / 2;
        const barHeight = (d.count / axisMax) * innerHeight;
        const y = padTop + innerHeight - barHeight;
        return (
          <g key={d.month}>
            <title>{`${d.label}: ${d.count} tarefa(s) concluída(s)`}</title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 0)}
              rx={4}
              fill={BAR_COLOR}
              className="hover:opacity-80 transition-opacity"
            />
            {d.count > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="#334155"
              >
                {d.count}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - padBottom + 14}
              textAnchor="middle"
              fontSize={10}
              fill={AXIS_TEXT}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function EmployeeRankingChart({ data }: { data: DashboardData["byUser"] }) {
  const width = 640;
  const rowHeight = 32;
  const height = Math.max(data.length * rowHeight, rowHeight);
  const labelWidth = 110;
  const padRight = 40;
  const innerWidth = width - labelWidth - padRight;

  const maxCount = Math.max(...data.map((d) => d.count), 0);
  const axisMax = niceCeil(maxCount);
  const barHeight = 18;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Tarefas concluídas por funcionário"
    >
      {data.map((d, i) => {
        const y = i * rowHeight + (rowHeight - barHeight) / 2;
        const barWidth = axisMax > 0 ? (d.count / axisMax) * innerWidth : 0;
        return (
          <g key={d.name}>
            <title>{`${d.name}: ${d.count} tarefa(s) concluída(s)`}</title>
            <text
              x={labelWidth - 8}
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              fontSize={11}
              fill="#334155"
            >
              {d.name.length > 16 ? `${d.name.slice(0, 15)}…` : d.name}
            </text>
            <rect
              x={labelWidth}
              y={y}
              width={Math.max(barWidth, 3)}
              height={barHeight}
              rx={4}
              fill={BAR_COLOR}
              className="hover:opacity-80 transition-opacity"
            />
            <text
              x={labelWidth + Math.max(barWidth, 3) + 6}
              y={y + barHeight / 2 + 4}
              fontSize={11}
              fontWeight={600}
              fill="#334155"
            >
              {d.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setData(json.dashboard))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">Não deu para carregar o painel. Tenta recarregar a página.</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-400">Carregando indicadores...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-900">📊 Painel de indicadores</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Últimos {data.periodMonths} meses · só tarefas da Loja
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatTile label="Tarefas concluídas no período" value={String(data.totalCompleted)} />
        <StatTile
          label="Tempo médio até concluir"
          value={data.avgCompletionHours !== null ? formatDuration(data.avgCompletionHours) : "—"}
          sub="Da criação até marcar como feita"
        />
        <StatTile
          label="Cliente mais recorrente"
          value={data.topClients[0]?.clientName ?? "—"}
          sub={data.topClients[0] ? `${data.topClients[0].count} atendimento(s)` : undefined}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Tarefas concluídas por mês</h2>
          <MonthlyBarChart data={data.monthly} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Ranking por funcionário</h2>
          {data.byUser.length > 0 ? (
            <EmployeeRankingChart data={data.byUser} />
          ) : (
            <p className="text-sm text-slate-400">Nenhuma tarefa concluída no período.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Clientes mais recorrentes</h2>
        {data.topClients.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-xs">
                <th className="font-medium pb-2">Cliente</th>
                <th className="font-medium pb-2 text-right">Atendimentos</th>
              </tr>
            </thead>
            <tbody>
              {data.topClients.map((c) => (
                <tr key={c.clientName} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-700">{c.clientName}</td>
                  <td className="py-1.5 text-right text-slate-700 font-medium">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-400">Nenhum cliente registrado no período.</p>
        )}
      </div>
    </div>
  );
}
