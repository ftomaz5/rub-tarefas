"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskItem, Status, STATUS_LABELS } from "@/lib/types";
import { TaskCard } from "./TaskCard";

interface Props {
  status: Status;
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
}

const COLUMN_STYLES: Record<Status, string> = {
  A_FAZER: "border-t-slate-400",
  FAZENDO: "border-t-amber-400",
  FEITO: "border-t-emerald-400",
};

export function KanbanColumn({ status, tasks, onTaskClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-full sm:w-80 shrink-0">
      <div className={`bg-white rounded-t-lg border border-b-0 border-slate-200 border-t-4 ${COLUMN_STYLES[status]} px-3 py-2.5 flex items-center justify-between`}>
        <h3 className="text-sm font-semibold text-slate-700">
          {STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 bg-slate-50 border border-slate-200 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors ${
          isOver ? "bg-blue-50" : ""
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">
            Nenhuma tarefa aqui
          </p>
        )}
      </div>
    </div>
  );
}
