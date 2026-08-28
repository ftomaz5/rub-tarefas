"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "USER" | "MODEL";
  content: string;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Atualização otimista: mostra a pergunta na hora, sem esperar o servidor
    const optimisticUser: Message = {
      id: `optimistic-${Date.now()}`,
      role: "USER",
      content: text,
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: "MODEL",
          content: data.text ?? "Não consegui responder agora.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `model-error-${Date.now()}`,
          role: "MODEL",
          content: "Não consegui falar com a IA agora. Tente novamente.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    if (!confirm("Limpar toda a conversa com o assistente?")) return;
    await fetch("/api/assistant", { method: "DELETE" });
    setMessages([]);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-premium flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-sm font-bold text-brand-900 tracking-[-0.01em]">
            🧠 Assistente RUB
          </h2>
          <p className="text-[11px] text-slate-400">
            Dúvidas sobre baterias, atendimento e gestão da loja
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors"
          >
            Limpar conversa
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <p className="text-sm text-slate-400 text-center py-8">
            Carregando conversa...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-10 px-4">
            <p className="text-sm text-slate-500 mb-1">
              Oi! Sou o assistente da RUB.
            </p>
            <p className="text-xs text-slate-400">
              Pergunte sobre baterias, atendimento ao cliente ou gestão da
              loja. Em breve também vou poder consultar os dados de tarefas e
              estoque direto por aqui.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${
                m.role === "USER"
                  ? "bg-brand-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-400 rounded-xl px-3.5 py-2.5 text-sm">
              digitando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200/80 p-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Pergunte algo ao assistente..."
          disabled={sending}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-brand-900 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-premium shadow-premium-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
