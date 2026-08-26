"use client";

import { useState, useEffect } from "react";
import {
  TaskItem,
  Workspace,
  Priority,
  Status,
  BatteryType,
  TaskUser,
  STATUS_LABELS,
  STATUS_ORDER,
  BATTERY_TYPE_LABELS,
  BATTERY_TYPE_ORDER,
} from "@/lib/types";

interface Props {
  open: boolean;
  workspace: Workspace;
  task: TaskItem | null; // null = criando nova
  users: TaskUser[];
  onClose: () => void;
  onSave: (data: {
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
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 pt-1">
      {children}
    </h3>
  );
}

export function TaskModal({
  open,
  workspace,
  task,
  users,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIA");
  const [status, setStatus] = useState<Status>("A_FAZER");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [batteryType, setBatteryType] = useState<BatteryType | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setAssigneeId(task.assignee?.id ?? "");
      setClientName(task.clientName ?? "");
      setClientPhone(task.clientPhone ?? "");
      setClientAddress(task.clientAddress ?? "");
      setBatteryType(task.batteryType ?? "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("MEDIA");
      setStatus("A_FAZER");
      setDueDate("");
      setAssigneeId("");
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setBatteryType("");
    }
  }, [task, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      id: task?.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: task ? status : undefined,
      dueDate: dueDate || null,
      assigneeId: assigneeId || null,
      clientName: clientName.trim() || null,
      clientPhone: clientPhone.trim() || null,
      clientAddress: clientAddress.trim() || null,
      batteryType: batteryType || null,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideUp_0.2s_ease-out]">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {task ? "Editar tarefa" : "Nova tarefa"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
            >
              ×
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Título
            </label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ex: Trocar bateria do cliente João"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Detalhes da tarefa..."
            />
          </div>

          {task && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prazo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {workspace === "LOJA" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Responsável (opcional)
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Ninguém específico</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {workspace === "LOJA" && (
            <>
              <div className="border-t border-slate-200 -mx-5 px-5 pt-1" />
              <SectionLabel>Dados do cliente (opcional)</SectionLabel>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome
                </label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Baterias
                  </label>
                  <select
                    value={batteryType}
                    onChange={(e) => setBatteryType(e.target.value as BatteryType | "")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Selecione</option>
                    {BATTERY_TYPE_ORDER.map((b) => (
                      <option key={b} value={b}>
                        {BATTERY_TYPE_LABELS[b]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Endereço
                </label>
                <div className="flex gap-2">
                  <input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Rua, número, bairro"
                  />
                  {clientAddress.trim() && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        clientAddress.trim()
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Traçar rota até o cliente"
                      className="shrink-0 flex items-center justify-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 transition-colors"
                    >
                      📍 Rota
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {task && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="text-sm text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 font-medium transition-colors"
              >
                Excluir
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-600 hover:bg-slate-100 rounded-lg px-4 py-2 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm bg-brand-900 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2 transition-colors shadow-sm"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
