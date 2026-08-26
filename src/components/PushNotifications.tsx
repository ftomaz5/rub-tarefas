"use client";

import { useEffect, useState } from "react";

// Converte a chave pública VAPID (base64 url-safe) para o formato que a API
// PushManager espera (Uint8Array).
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type PushState = "unsupported" | "loading" | "off" | "on" | "denied";

export function PushNotifications() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setState(existing ? "on" : "off");
      } catch {
        setState("off");
      }
    }
    check();
  }, []);

  async function handleEnable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      alert("Notificações ainda não configuradas neste app.");
      return;
    }

    setState("loading");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      setState("on");
    } catch {
      setState("off");
    }
  }

  async function handleDisable() {
    setState("loading");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported" || state === "loading") return null;

  if (state === "denied") {
    return (
      <span
        className="text-slate-300"
        title="Notificações bloqueadas nas configurações do navegador"
      >
        🔕
      </span>
    );
  }

  if (state === "on") {
    return (
      <button
        type="button"
        onClick={handleDisable}
        title="Lembretes de tarefa ativados — clique para desativar"
        className="text-brand-700 hover:text-brand-900 transition-colors"
      >
        🔔
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleEnable}
      title="Ativar lembretes de tarefa (15 min antes do horário)"
      className="text-slate-400 hover:text-brand-700 transition-colors"
    >
      🔔
    </button>
  );
}
