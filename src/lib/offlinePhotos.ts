"use client";

// Fila offline para a FOTO da garantia (2ª etapa do modo offline).
//
// Diferente da fila de status (offlineQueue.ts), aqui guardamos o arquivo de
// imagem em si (não só um texto) — por isso usa um object store separado
// dentro do mesmo banco IndexedDB. Quando o celular está sem internet:
//   1. A foto tirada é guardada aqui (o arquivo completo, localmente)
//   2. A tela mostra a prévia na hora, usando a própria foto local
//   3. Quando a internet volta, a foto sobe pro Vercel Blob automaticamente
//      e a tarefa é atualizada com o link final
//
// Cada tarefa só pode ter 1 foto pendente por vez (se tirar outra antes de
// sincronizar, substitui a anterior — mesmo comportamento de trocar a foto
// online).

import { openOfflineDb, PHOTO_STORE } from "./offlineDb";

const openDb = openOfflineDb;

export interface PendingPhoto {
  taskId: string; // chave primária: 1 foto pendente por tarefa
  blob: Blob;
  fileName: string;
  contentType: string;
  createdAt: number;
}

// Prefixo especial guardado no campo warrantyPhotoUrl (em memória, na tela)
// enquanto a foto ainda não subiu. Nunca é salvo assim no banco de verdade —
// é só um sinal para a interface saber "essa foto ainda está local".
export const LOCAL_PHOTO_PREFIX = "local-pending:";

export function isLocalPendingPhoto(url: string | null | undefined): boolean {
  return !!url && url.startsWith(LOCAL_PHOTO_PREFIX);
}

export async function queuePhoto(taskId: string, file: File): Promise<void> {
  const db = await openDb();
  const entry: PendingPhoto = {
    taskId,
    blob: file,
    fileName: file.name,
    contentType: file.type,
    createdAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getPendingPhoto(taskId: string): Promise<PendingPhoto | null> {
  const db = await openDb();
  const result = await new Promise<PendingPhoto | null>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readonly");
    const req = tx.objectStore(PHOTO_STORE).get(taskId);
    req.onsuccess = () => resolve((req.result as PendingPhoto) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function getAllPendingPhotos(): Promise<PendingPhoto[]> {
  const db = await openDb();
  const result = await new Promise<PendingPhoto[]>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readonly");
    const req = tx.objectStore(PHOTO_STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingPhoto[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function removePendingPhoto(taskId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).delete(taskId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function countPendingPhotos(): Promise<number> {
  try {
    const all = await getAllPendingPhotos();
    return all.length;
  } catch {
    return 0;
  }
}

// Tenta subir todas as fotos pendentes pro Vercel Blob e atualizar a tarefa
// com o link final. Para no primeiro erro de rede (fica pra próxima tentativa).
export async function flushPendingPhotos(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  const pending = await getAllPendingPhotos();

  for (const photo of pending) {
    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([photo.blob], photo.fileName, { type: photo.contentType })
      );
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        // Erro do servidor (não é falta de conexão) — descarta, reenviar não ajuda
        await removePendingPhoto(photo.taskId);
        failed++;
        continue;
      }
      const uploadData = await uploadRes.json();

      const patchRes = await fetch(`/api/tasks/${photo.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warrantyPhotoUrl: uploadData.url }),
      });

      if (patchRes.ok) {
        await removePendingPhoto(photo.taskId);
        synced++;
      } else {
        failed++;
      }
    } catch {
      // Sem conexão ainda — para por aqui, tenta tudo de novo na próxima vez
      break;
    }
  }

  return { synced, failed };
}
