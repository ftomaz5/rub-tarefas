"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskItem, Status, STATUS_LABELS } from "@/lib/types";
import { TaskCard } from "./TaskCard";

interface Props {
  status: Status;
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onTaskComplete: (task: TaskItem) => void;
  onTaskStart: (task: TaskItem) => void;
}

const COLUMN_STYLES: Record<Status, string> = {
  A_FAZER: "border-t-slate-400",
  FAZENDO: "border-t-gold-400",
  FEITO: "border-t-emerald-400",
};

const COLUMN_DOT: Record<Status, string> = {
  A_FAZER: "bg-slate-400",
  FAZENDO: "bg-gold-400",
  FEITO: "bg-emerald-400",
};

export function KanbanColumn({ status, tasks, onTaskClick, onTaskComplete, onTaskStart }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-full sm:w-80 shrink-0">
      <div className={`bg-white rounded-t-xl border border-b-0 border-slate-200 border-t-[3px] ${COLUMN_STYLES[status]} px-4 py-3.5 flex items-center justify-between`}>
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 tracking-wide uppercase text-[13px]">
          <span className={`w-1.5 h-1.5 rounded-full ${COLUMN_DOT[status]}`} />
          {STATUS_LABELS[status]}
        </h3>
        <span className="text-xs font-semibold text-brand-800 bg-brand-50 rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 bg-slate-50/60 border border-slate-200 rounded-b-xl p-2.5 space-y-2.5 min-h-[200px] transition-colors ${
          isOver ? "bg-gold-50/60 border-gold-300" : ""
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onComplete={() => onTaskComplete(task)}
              onStart={() => onTaskStart(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-1.5">
            <span className="text-2xl opacity-40">🔋</span>
            <p className="text-xs text-slate-400">Nenhuma tarefa aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
