import webpush from "web-push";

// Chaves VAPID: identificam o servidor para os provedores de push (Google, Apple, etc).
// Geradas uma única vez e guardadas como variáveis de ambiente.
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:contato@exemplo.com";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY precisam estar configuradas nas variáveis de ambiente"
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: boolean; expired: boolean }> {
  ensureConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return { ok: true, expired: false };
  } catch (err: unknown) {
    // 404/410 = a inscrição não existe mais (usuário desinstalou, trocou de navegador, etc.)
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const expired = statusCode === 404 || statusCode === 410;
    if (!expired) {
      console.error("Erro ao enviar push:", err);
    }
    return { ok: false, expired };
  }
}
