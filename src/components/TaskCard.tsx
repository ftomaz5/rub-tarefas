"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskItem, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";

interface Props {
  task: TaskItem;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: Props) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-medium text-slate-900 leading-snug break-words">
          {task.title}
        </h4>
      </div>

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
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
            Loja
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
          </span>
        )}

        {task.assignee && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 ml-auto">
            {task.assignee.name.split(" ")[0]}
          </span>
        )}
      </div>
    </div>
  );
}
