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
import { arrayMove } from "@dnd-kit/sortable";
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
import { queueStatusChange, flushQueue, countPending } from "@/lib/offlineQueue";
import { flushPendingPhotos, countPendingPhotos } from "@/lib/offlinePhotos";

interface Props {
  workspace: Workspace;
}

export function KanbanBoard({ workspace }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<TaskItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const sensors = useSensors(
    // Vale tanto para mouse quanto para toque: só começa a arrastar depois
    // de SEGURAR parado por meio segundo. Um clique/toque normal (mesmo que
    // se mova um pouco sem querer) abre a tarefa normalmente — só vira
    // "arrastar" se a pessoa mantiver o dedo/botão pressionado de propósito.
    useSensor(PointerSensor, {
      activationConstraint: { delay: 500, tolerance: 10 },
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
      fetch("/api/clients")
        .then((r) => r.json())
        .then((d) => setClientNames(d.clients ?? []))
        .catch(() => {});
    }
  }, [workspace, loadTasks]);

  // Sincronização automática: quando a conexão volta, reenvia tudo que ficou
  // pendente enquanto o celular estava sem internet (concluir/iniciar/mover
  // tarefa, e também foto da garantia). Também atualiza o indicador "sem
  // conexão" no topo da tela.
  const syncPending = useCallback(async () => {
    const [{ synced: syncedStatus }, { synced: syncedPhotos }] = await Promise.all([
      flushQueue(),
      flushPendingPhotos(),
    ]);
    if (syncedStatus > 0 || syncedPhotos > 0) {
      await loadTasks();
    }
    const [statusCount, photoCount] = await Promise.all([
      countPending(),
      countPendingPhotos(),
    ]);
    setPendingCount(statusCount + photoCount);
  }, [loadTasks]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    Promise.all([countPending(), countPendingPhotos()]).then(([a, b]) =>
      setPendingCount(a + b)
    );

    function handleOnline() {
      setIsOnline(true);
      syncPending();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Se já estiver online ao abrir o app, tenta sincronizar qualquer coisa
    // que tenha ficado pendente de uma sessão offline anterior.
    if (navigator.onLine) syncPending();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPending]);

  const runSearch = useCallback(
    async (term: string) => {
      const res = await fetch(
        `/api/tasks?workspace=${workspace}&includeCompleted=true`
      );
      if (res.ok) {
        const data = await res.json();
        const lower = term.toLowerCase();
        const matches = (data.tasks as TaskItem[]).filter((t) =>
          t.clientName?.toLowerCase().includes(lower)
        );
        setSearchResults(matches);
      }
    },
    [workspace]
  );

  // Busca por cliente: procura pelo nome em todas as tarefas (incluindo já
  // concluídas), não só nas que estão visíveis no quadro no momento.
  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      await runSearch(term);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, workspace, runSearch]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determina a coluna de destino: pode ser o id de outra tarefa (mesma coluna
    // ou coluna diferente) ou o id da própria coluna (quando solta em espaço vazio)
    let targetStatus: Status;
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      targetStatus = overTask.status;
    } else if (STATUS_ORDER.includes(over.id as Status)) {
      targetStatus = over.id as Status;
    } else {
      return;
    }

    if (activeTask.status === targetStatus) {
      // Reordenando dentro da mesma coluna: recalcula a posição de todas as
      // tarefas dessa coluna e salva a nova ordem (antes isso não era salvo).
      if (!overTask || overTask.id === activeTask.id) return;

      const columnTasks = tasksByStatus(targetStatus);
      const oldIndex = columnTasks.findIndex((t) => t.id === activeTask.id);
      const newIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      const positionById = new Map(reordered.map((t, i) => [t.id, i]));

      // Atualização otimista
      setTasks((prev) =>
        prev.map((t) =>
          positionById.has(t.id) ? { ...t, position: positionById.get(t.id)! } : t
        )
      );

      const res = await fetch(`/api/tasks/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((t, i) => ({ id: t.id, position: i })),
        }),
      });

      if (!res.ok) {
        loadTasks();
      }
      return;
    }

    // Movendo para outra coluna: entra no final dela
    const destColumnTasks = tasksByStatus(targetStatus);
    const newPosition = destColumnTasks.length;

    // Atualização otimista
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTask.id ? { ...t, status: targetStatus, position: newPosition } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${activeTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, position: newPosition }),
      });
      if (!res.ok) {
        // Reverte em caso de erro do servidor (não é problema de conexão)
        loadTasks();
      }
    } catch {
      // Sem conexão: mantém a mudança na tela e guarda para sincronizar depois
      await queueStatusChange(activeTask.id, { status: targetStatus, position: newPosition });
      setPendingCount(await countPending());
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
    warrantyPhotoUrl?: string | null;
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
          warrantyPhotoUrl: data.warrantyPhotoUrl,
        }),
      });
      if (res.ok) {
        await loadTasks();
        if (search.trim()) await runSearch(search.trim());
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
          warrantyPhotoUrl: data.warrantyPhotoUrl,
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
      if (search.trim()) await runSearch(search.trim());
      setModalOpen(false);
      setEditingTask(null);
    }
  }

  async function handleComplete(task: TaskItem) {
    // Atualização otimista: move para a coluna Feito na hora,
    // sem sumir do quadro (igual arrastar manualmente para lá).
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "FEITO" } : t))
    );
    setSearchResults((prev) =>
      prev ? prev.map((t) => (t.id === task.id ? { ...t, status: "FEITO" } : t)) : prev
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FEITO" }),
      });
      if (!res.ok) {
        // Reverte em caso de erro do servidor (não é problema de conexão)
        loadTasks();
      }
    } catch {
      // Sem conexão: mantém a mudança na tela e guarda para sincronizar depois
      await queueStatusChange(task.id, { status: "FEITO" });
      setPendingCount(await countPending());
    }
  }

  async function handleStart(task: TaskItem) {
    // Atualização otimista: move para a coluna Fazendo na hora,
    // sem sumir do quadro (igual arrastar manualmente para lá).
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "FAZENDO" } : t))
    );
    setSearchResults((prev) =>
      prev ? prev.map((t) => (t.id === task.id ? { ...t, status: "FAZENDO" } : t)) : prev
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FAZENDO" }),
      });
      if (!res.ok) {
        // Reverte em caso de erro do servidor (não é problema de conexão)
        loadTasks();
      }
    } catch {
      // Sem conexão: mantém a mudança na tela e guarda para sincronizar depois
      await queueStatusChange(task.id, { status: "FAZENDO" });
      setPendingCount(await countPending());
    }
  }

  const tasksByStatus = (status: Status) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => {
        // Ordena por dia e horário: tarefas com prazo mais próximo primeiro.
        // Tarefas sem prazo ficam sempre no final.
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return a.position - b.position;
      });

  const isSearching = search.trim().length > 0;

  return (
    <div>
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-lg px-3 py-2 mb-3">
          <span>📡</span>
          <span>
            Sem conexão — suas ações continuam sendo salvas no celular e serão
            enviadas automaticamente assim que a internet voltar.
            {pendingCount > 0 &&
              ` (${pendingCount} ${pendingCount === 1 ? "pendente" : "pendentes"})`}
          </span>
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm rounded-lg px-3 py-2 mb-3">
          <span>🔄</span>
          <span>Sincronizando {pendingCount} {pendingCount === 1 ? "ação" : "ações"} pendente...</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white shadow-premium focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-colors"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
          className="bg-brand-900 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-all shadow-premium shadow-premium-hover sm:ml-auto"
        >
          + Nova tarefa
        </button>
      </div>

      {isSearching ? (
        <div className="space-y-2.5">
          {searching && (
            <p className="text-sm text-slate-400 text-center py-8">Buscando...</p>
          )}

          {!searching && searchResults && searchResults.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              Nenhuma tarefa encontrada para &quot;{search.trim()}&quot;
            </p>
          )}

          {!searching &&
            searchResults &&
            searchResults.length > 0 &&
            searchResults.map((task) => (
              <div key={task.id} className="max-w-md">
                <TaskCard
                  task={task}
                  onClick={() => {
                    setEditingTask(task);
                    setModalOpen(true);
                  }}
                  onComplete={() => handleComplete(task)}
                  onStart={() => handleStart(task)}
                />
              </div>
            ))}
        </div>
      ) : loading ? (
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
                onTaskStart={handleStart}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 opacity-90">
                <TaskCard
                  task={activeTask}
                  onClick={() => {}}
                  onComplete={() => {}}
                  onStart={() => {}}
                />
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
        clientNames={clientNames}
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
