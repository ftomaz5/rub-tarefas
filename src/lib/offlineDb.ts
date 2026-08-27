"use client";

// Ponto único de abertura do banco IndexedDB usado pelo modo offline.
// offlineQueue.ts (status da tarefa) e offlinePhotos.ts (foto da garantia)
// compartilham o MESMO banco, então a versão e a criação das "gavetas"
// (object stores) precisam ficar num lugar só — evita erro de versão
// conflitante entre os dois arquivos.

export const OFFLINE_DB_NAME = "rub-tarefas-offline";
export const OFFLINE_DB_VERSION = 2;
export const STATUS_STORE = "pending-status-changes";
export const PHOTO_STORE = "pending-photos";

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB não disponível"));
      return;
    }
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STATUS_STORE)) {
        db.createObjectStore(STATUS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: "taskId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
