"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import {
  TaskItem,
  TaskUser,
  Status,
  Workspace,
  Priority,
  BatteryType,
  STATUS_ORDER,
} from "@/lib/types";

interface Props {
  workspace: Workspace;
}

export function KanbanBoard({ workspace }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?workspace=${workspace}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
    if (workspace === "LOJA") {
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []))
        .catch(() => {});
    }
  }, [workspace, loadTasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determina a coluna de destino: pode ser o id de outra tarefa (mesma coluna) ou o id da coluna
    let targetStatus: Status;
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      targetStatus = overTask.status;
    } else if (STATUS_ORDER.includes(over.id as Status)) {
      targetStatus = over.id as Status;
    } else {
      return;
    }

    if (activeTask.status === targetStatus) return;

    // Atualização otimista
    setTasks((prev) =>
      prev.map((t) => (t.id === activeTask.id ? { ...t, status: targetStatus } : t))
    );

    const res = await fetch(`/api/tasks/${activeTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    });

    if (!res.ok) {
      // Reverte em caso de erro
      loadTasks();
    }
  }

  async function handleSave(data: {
    id?: string;
    title: string;
    description: string | null;
    priority: Priority;
    status?: Status;
    dueDate: string | null;
    assigneeId: string | null;
    clientName: string | null;
    clientPhone: string | null;
    clientAddress: string | null;
    batteryType: BatteryType | null;
  }) {
    if (data.id) {
      const res = await fetch(`/api/tasks/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status,
          dueDate: data.dueDate,
          assigneeId: data.assigneeId,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          clientAddress: data.clientAddress,
          batteryType: data.batteryType,
        }),
      });
      if (res.ok) {
        await loadTasks();
        setModalOpen(false);
        setEditingTask(null);
      }
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          workspace,
          priority: data.priority,
          dueDate: data.dueDate,
          assigneeId: data.assigneeId,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          clientAddress: data.clientAddress,
          batteryType: data.batteryType,
        }),
      });
      if (res.ok) {
        await loadTasks();
        setModalOpen(false);
      }
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadTasks();
      setModalOpen(false);
      setEditingTask(null);
    }
  }

  async function handleComplete(task: TaskItem) {
    // Atualização otimista: some da tela na hora
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    if (!res.ok) {
      // Reverte em caso de erro
      loadTasks();
    }
  }

  const tasksByStatus = (status: Status) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
          className="bg-brand-900 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors shadow-sm hover:shadow-md"
        >
          + Nova tarefa
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-12">Carregando...</p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col sm:flex-row gap-4 overflow-x-auto pb-4">
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus(status)}
                onTaskClick={(task) => {
                  setEditingTask(task);
                  setModalOpen(true);
                }}
                onTaskComplete={handleComplete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} onClick={() => {}} onComplete={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskModal
        open={modalOpen}
        workspace={workspace}
        task={editingTask}
        users={users}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
