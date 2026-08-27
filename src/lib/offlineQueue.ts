"use client";

// Fila offline simples (usando IndexedDB) para mudanças de status de tarefa
// (concluir, iniciar, mover de coluna). Quando o celular está sem internet,
// a ação fica guardada aqui e é reenviada automaticamente assim que a conexão
// volta — sem perder o que o entregador fez na rua.
//
// Escopo proposital: só cobre mudança de status/posição. Criar tarefa nova e
// tirar foto continuam exigindo internet (por enquanto), porque envolvem mais
// dado (e a foto precisa subir pro Vercel Blob de qualquer forma).

const DB_NAME = "rub-tarefas-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-status-changes";

export interface PendingStatusChange {
  id: string; // id interno da fila (não é o id da tarefa)
  taskId: string;
  status?: string;
  position?: number;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB não disponível"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueStatusChange(
  taskId: string,
  patch: { status?: string; position?: number }
): Promise<void> {
  const db = await openDb();
  const entry: PendingStatusChange = {
    id: `${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    ...patch,
    createdAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getPendingChanges(): Promise<PendingStatusChange[]> {
  const db = await openDb();
  const result = await new Promise<PendingStatusChange[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingStatusChange[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  // Ordena pela ordem em que foram criadas, pra sincronizar na sequência certa
  return result.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePendingChange(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Tenta reenviar tudo que está na fila. Para no primeiro erro de rede (sem
// remover da fila) para tentar de novo mais tarde; erros de servidor (4xx/5xx)
// descartam o item, já que reenviar não vai resolver.
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  const pending = await getPendingChanges();

  for (const change of pending) {
    try {
      const res = await fetch(`/api/tasks/${change.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(change.status !== undefined ? { status: change.status } : {}),
          ...(change.position !== undefined ? { position: change.position } : {}),
        }),
      });

      if (res.ok) {
        await removePendingChange(change.id);
        synced++;
      } else if (res.status >= 400 && res.status < 500) {
        // Tarefa pode ter sido excluída, ou sem permissão — não adianta tentar de novo
        await removePendingChange(change.id);
        failed++;
      } else {
        // Erro de servidor: mantém na fila, tenta de novo na próxima
        failed++;
      }
    } catch {
      // Sem conexão ainda — para por aqui, tenta tudo de novo na próxima vez
      break;
    }
  }

  return { synced, failed };
}

export async function countPending(): Promise<number> {
  try {
    const pending = await getPendingChanges();
    return pending.length;
  } catch {
    return 0;
  }
}
