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
import { buildMapsUrl } from "@/lib/maps";
import { queuePhoto, isLocalPendingPhoto } from "@/lib/offlinePhotos";
import {
  normalizePhoneForWhatsapp,
  buildTaskWhatsappMessage,
  buildWhatsappLink,
} from "@/lib/whatsapp";

interface Props {
  open: boolean;
  workspace: Workspace;
  task: TaskItem | null; // null = criando nova
  users: TaskUser[];
  // Nomes de clientes já usados antes, pra sugerir/autocompletar (evita
  // duplicar o mesmo cliente com grafia diferente). Opcional — se não vier,
  // o campo funciona normal, só sem sugestão.
  clientNames?: string[];
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
    // undefined = não mexe no campo (usado quando a foto ainda está pendente
    // de sincronizar offline, para não sobrescrever o link real com o marcador local)
    warrantyPhotoUrl?: string | null;
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
  clientNames = [],
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIA");
  const [status, setStatus] = useState<Status>("A_FAZER");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [batteryType, setBatteryType] = useState<BatteryType | "">("");
  const [warrantyPhotoUrl, setWarrantyPhotoUrl] = useState<string | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoZoomOpen, setPhotoZoomOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [askingPhoneFor, setAskingPhoneFor] = useState<string | null>(null); // id do usuário sem telefone cadastrado
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneInputError, setPhoneInputError] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority);
      setStatus(task.status);
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        setDueDate(task.dueDate.slice(0, 10));
        // Só preenche a hora se a tarefa realmente tiver um horário definido
        // (tarefas antigas, sem hora, foram salvas à meia-noite)
        const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
        setDueTime(hasTime ? d.toTimeString().slice(0, 5) : "");
      } else {
        setDueDate("");
        setDueTime("");
      }
      setAssigneeId(task.assignee?.id ?? "");
      setClientName(task.clientName ?? "");
      setClientPhone(task.clientPhone ?? "");
      setClientAddress(task.clientAddress ?? "");
      setBatteryType(task.batteryType ?? "");
      setWarrantyPhotoUrl(task.warrantyPhotoUrl ?? null);
    } else {
      setTitle("");
      setDescription("");
      setPriority("MEDIA");
      setStatus("A_FAZER");
      setDueDate("");
      setDueTime("");
      setAssigneeId("");
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setBatteryType("");
      setWarrantyPhotoUrl(null);
    }
    setPhotoError("");
    setPhotoZoomOpen(false);
    setLocalPhotoPreview(null);
    setAskingPhoneFor(null);
    setPhoneInput("");
    setPhoneInputError("");
  }, [task, open]);

  if (!open) return null;

  const assignedUser = users.find((u) => u.id === assigneeId) ?? null;

  function openWhatsappForAssignee() {
    if (!assignedUser) return;

    if (!assignedUser.phone) {
      setAskingPhoneFor(assignedUser.id);
      setPhoneInput("");
      setPhoneInputError("");
      return;
    }

    const phone = normalizePhoneForWhatsapp(assignedUser.phone);
    if (!phone) {
      setAskingPhoneFor(assignedUser.id);
      setPhoneInput("");
      setPhoneInputError("");
      return;
    }

    const message = buildTaskWhatsappMessage({
      title: title.trim() || "Nova tarefa",
      description: description.trim() || null,
      clientName: clientName.trim() || null,
      clientPhone: clientPhone.trim() || null,
      clientAddress: clientAddress.trim() || null,
      dueDate: buildDueDate(),
    });
    window.open(buildWhatsappLink(phone, message), "_blank", "noopener,noreferrer");
  }

  async function handleSavePhoneAndSend() {
    if (!askingPhoneFor) return;
    const normalized = normalizePhoneForWhatsapp(phoneInput);
    if (!normalized) {
      setPhoneInputError("Telefone inválido. Digite DDD + número (ex: 43 99999-9999).");
      return;
    }
    setPhoneInputError("");

    setSavingPhone(true);
    try {
      const res = await fetch("/api/users/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: askingPhoneFor, phone: phoneInput.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPhoneInputError(data?.error ?? "Não foi possível salvar o telefone.");
        return;
      }

      // Atualiza a lista de usuários em memória (o componente pai vai
      // recarregar na próxima abertura, mas isso evita pedir de novo agora)
      const idx = users.findIndex((u) => u.id === askingPhoneFor);
      if (idx !== -1) users[idx] = { ...users[idx], phone: data.user.phone };

      const message = buildTaskWhatsappMessage({
        title: title.trim() || "Nova tarefa",
        description: description.trim() || null,
        clientName: clientName.trim() || null,
        clientPhone: clientPhone.trim() || null,
        clientAddress: clientAddress.trim() || null,
        dueDate: buildDueDate(),
      });
      window.open(buildWhatsappLink(normalized, message), "_blank", "noopener,noreferrer");
      setAskingPhoneFor(null);
      setPhoneInput("");
    } catch {
      setPhoneInputError("Não foi possível salvar o telefone. Verifique sua conexão.");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;

    setPhotoError("");
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPhotoError(data?.error ?? "Não foi possível enviar a foto.");
        return;
      }
      setWarrantyPhotoUrl(data.url);
      setLocalPhotoPreview(null);
    } catch {
      // Sem conexão: se a tarefa já existe, guarda a foto no celular e
      // mostra a prévia local. O envio de verdade acontece sozinho quando a
      // internet voltar (mesma lógica de status/mover tarefa).
      if (task?.id) {
        await queuePhoto(task.id, file);
        setLocalPhotoPreview(URL.createObjectURL(file));
        setWarrantyPhotoUrl(`local-pending:${task.id}`);
        setPhotoError("");
      } else {
        setPhotoError(
          "Sem conexão. Para tirar foto de garantia é preciso salvar a tarefa primeiro com internet."
        );
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  function buildDueDate(): string | null {
    if (!dueDate) return null;
    // Combina data + hora (quando informada) em um horário local,
    // evitando problemas de fuso ao converter para ISO.
    const [year, month, day] = dueDate.split("-").map(Number);
    const [hours, minutes] = dueTime ? dueTime.split(":").map(Number) : [0, 0];
    const combined = new Date(year, (month ?? 1) - 1, day, hours, minutes);
    return combined.toISOString();
  }

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
      dueDate: buildDueDate(),
      assigneeId: assigneeId || null,
      clientName: clientName.trim() || null,
      clientPhone: clientPhone.trim() || null,
      clientAddress: clientAddress.trim() || null,
      batteryType: batteryType || null,
      // Enquanto a foto está só guardada no celular (offline), não manda esse
      // marcador pro servidor — ele não é uma URL de verdade. O link real é
      // preenchido sozinho quando a foto sincronizar (veja offlinePhotos.ts).
      // "undefined" aqui faz o KanbanBoard simplesmente não mexer nesse campo.
      warrantyPhotoUrl: isLocalPendingPhoto(warrantyPhotoUrl)
        ? undefined
        : warrantyPhotoUrl,
    });
    setSaving(false);
  }

  return (
    <>
    {photoZoomOpen && warrantyPhotoUrl && (
      <div
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 animate-[fadeIn_0.15s_ease-out]"
        onClick={() => setPhotoZoomOpen(false)}
      >
        <button
          type="button"
          onClick={() => setPhotoZoomOpen(false)}
          title="Fechar"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20"
        >
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            isLocalPendingPhoto(warrantyPhotoUrl)
              ? localPhotoPreview ?? undefined
              : warrantyPhotoUrl
          }
          alt="Foto da garantia (ampliada)"
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full w-auto h-auto object-contain touch-pinch-zoom select-none rounded-sm"
        />
        <p
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/60 px-4"
        >
          Toque fora da foto para fechar. No celular, dá para dar zoom com dois dedos.
        </p>
      </div>
    )}
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border-t-2 border-t-gold-400 sm:border-t-0 animate-[slideUp_0.2s_ease-out]">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-900 tracking-[-0.01em]">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prazo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!e.target.value) setDueTime("");
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Horário (opcional)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value);
                  // Se ainda não tem data, assume hoje ao informar um horário
                  if (e.target.value && !dueDate) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, "0");
                    const dd = String(today.getDate()).padStart(2, "0");
                    setDueDate(`${yyyy}-${mm}-${dd}`);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          {dueDate && (
            <p className="text-xs text-slate-400 -mt-2">
              {dueTime
                ? "A tarefa entra na fila do dia pelo horário definido."
                : "Sem horário, a tarefa aparece depois das que têm hora marcada nesse dia."}
            </p>
          )}

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

              {assignedUser && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={openWhatsappForAssignee}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3 py-2 transition-colors"
                  >
                    📱 Enviar tarefa no WhatsApp para {assignedUser.name.split(" ")[0]}
                  </button>

                  {askingPhoneFor === assignedUser.id && (
                    <div className="mt-2 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <p className="text-xs text-slate-600">
                        Ainda não temos o WhatsApp de {assignedUser.name.split(" ")[0]} salvo.
                        Digite o número (com DDD) — só precisa fazer isso uma vez.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          autoFocus
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="(43) 99999-9999"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={handleSavePhoneAndSend}
                          disabled={savingPhone || !phoneInput.trim()}
                          className="shrink-0 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg px-3 transition-colors"
                        >
                          {savingPhone ? "..." : "Salvar e enviar"}
                        </button>
                      </div>
                      {phoneInputError && (
                        <p className="text-xs text-red-600">{phoneInputError}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => setAskingPhoneFor(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                  list="client-names-datalist"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Nome do cliente"
                />
                {clientNames.length > 0 && (
                  <datalist id="client-names-datalist">
                    {clientNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Começa a digitar e escolhe um cliente já cadastrado, se aparecer — mantém o
                  nome sempre igual pros números do painel baterem certo.
                </p>
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
                      href={buildMapsUrl(clientAddress) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Traçar rota da sua localização atual até o cliente"
                      className="shrink-0 flex items-center justify-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 transition-colors"
                    >
                      📍 Rota
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Não precisa digitar &quot;Bandeirantes&quot; — o app já completa isso ao traçar a rota.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Foto da garantia
                </label>

                {warrantyPhotoUrl ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        isLocalPendingPhoto(warrantyPhotoUrl)
                          ? localPhotoPreview ?? undefined
                          : warrantyPhotoUrl
                      }
                      alt="Foto da garantia"
                      onClick={() => setPhotoZoomOpen(true)}
                      className="h-40 w-40 rounded-lg object-cover border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                    {isLocalPendingPhoto(warrantyPhotoUrl) && (
                      <span
                        title="Guardada no celular — vai enviar sozinha quando a internet voltar"
                        className="absolute bottom-1.5 left-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/90 text-white shadow-sm"
                      >
                        📤 aguardando envio
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotoZoomOpen(true)}
                      title="Ampliar foto"
                      className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-slate-900/80 text-white text-sm flex items-center justify-center shadow-sm hover:bg-slate-900"
                    >
                      🔍
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWarrantyPhotoUrl(null);
                        setLocalPhotoPreview(null);
                      }}
                      title="Remover foto"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center shadow-sm hover:bg-slate-700"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-700 cursor-pointer transition-colors">
                    {uploadingPhoto ? (
                      "Enviando foto..."
                    ) : (
                      <>📷 Tirar ou escolher foto</>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                )}

                {photoError && (
                  <p className="text-xs text-red-600 mt-1">{photoError}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Fica guardada no app — não some se apagar do celular.
                </p>
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
              disabled={saving || uploadingPhoto}
              className="text-sm bg-brand-900 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2 transition-all shadow-premium shadow-premium-hover"
            >
              {saving ? "Salvando..." : uploadingPhoto ? "Enviando foto..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
