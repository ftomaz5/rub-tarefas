"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskItem, PRIORITY_LABELS, PRIORITY_COLORS, BATTERY_TYPE_LABELS } from "@/lib/types";
import { buildMapsUrl } from "@/lib/maps";

interface Props {
  task: TaskItem;
  onClick: () => void;
  onComplete: () => void;
  onStart: () => void;
}

export function TaskCard({ task, onClick, onComplete, onStart }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isLate =
    task.dueDate &&
    task.status !== "FEITO" &&
    new Date(task.dueDate) < new Date(new Date().toDateString());

  const hasTime =
    task.dueDate &&
    (new Date(task.dueDate).getHours() !== 0 || new Date(task.dueDate).getMinutes() !== 0);

  const mapsUrl = buildMapsUrl(task.clientAddress);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-xl border p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing touch-none ${
        isLate
          ? "border-red-200 border-l-[3px] border-l-red-400"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-semibold text-slate-900 leading-snug break-words">
          {task.title}
        </h4>
      </div>

      {task.clientName && (
        <p className="text-xs text-slate-600 mb-1 flex items-center gap-1">
          <span className="text-slate-400">👤</span>
          {task.clientName}
        </p>
      )}

      {task.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.workspace === "LOJA" && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
            Loja
          </span>
        )}

        {task.batteryType && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            🔋 {BATTERY_TYPE_LABELS[task.batteryType]}
          </span>
        )}

        {task.warrantyPhotoUrl && (
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
            title="Tem foto da garantia anexada"
          >
            📷 Garantia
          </span>
        )}

        {task.dueDate && (
          <span
            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
              isLate ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {new Date(task.dueDate).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}
            {hasTime &&
              ` · ${new Date(task.dueDate).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}`}
          </span>
        )}

        {task.assignee && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 ml-auto">
            {task.assignee.name.split(" ")[0]}
          </span>
        )}
      </div>

      {(mapsUrl || task.status !== "FEITO") && (
        <div className="flex gap-1.5 mt-2.5">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 active:scale-[0.98] rounded-lg py-1.5 px-2.5 transition-all shrink-0"
              title="Traçar rota até o cliente"
            >
              📍 Rota
            </a>
          )}
          {task.status === "A_FAZER" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 text-xs font-semibold text-gold-700 bg-gold-50 hover:bg-gold-100 active:scale-[0.98] rounded-lg py-1.5 transition-all"
            >
              ▶ Iniciar tarefa
            </button>
          )}
          {task.status !== "FEITO" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] rounded-lg py-1.5 transition-all"
            >
              ✓ Concluir tarefa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
