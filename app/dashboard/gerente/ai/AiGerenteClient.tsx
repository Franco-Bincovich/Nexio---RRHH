"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Cuál es el estado general de la empresa?",
  "¿Qué áreas tienen más solicitudes pendientes?",
  "¿Cómo está el clima organizacional?",
  "¿Qué objetivos están en riesgo?",
];

interface Props {
  empresaId:    string;
  empresaNombre: string;
}

export default function AiGerenteClient({ empresaId, empresaNombre }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/gerente", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ messages: newMessages, empresaId }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.content }]);
      }
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen max-h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4 flex items-center gap-3">
        <NexioAvatar />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">Nexio AI</span>
            <span className="text-[10px] font-bold bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded-full tracking-wide">BETA</span>
          </div>
          <p className="text-xs text-secondary">{empresaNombre}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center text-center mb-10 pt-4">
              <NexioAvatar size={52} />
              <h2 className="mt-4 text-xl font-bold">Nexio AI</h2>
              <p className="text-secondary text-sm mt-1 max-w-md">
                Asistente inteligente con datos reales de toda tu empresa. Preguntame lo que necesitás.
              </p>
            </div>
            <p className="text-[11px] text-secondary/50 uppercase tracking-[0.5px] mb-3 text-center">Sugerencias</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm text-secondary hover:text-foreground bg-surface border border-border hover:border-accent/30 rounded-xl px-4 py-3 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-3xl mx-auto ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {msg.role === "assistant" ? (
              <div className="flex-shrink-0 mt-0.5"><NexioAvatar size={28} /></div>
            ) : (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[10px] font-bold text-accent mt-0.5">
                Vos
              </div>
            )}
            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-accent/10 border border-accent/20 text-foreground rounded-tr-sm"
                : "bg-surface border border-border text-secondary rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-3xl mx-auto">
            <div className="flex-shrink-0 mt-0.5"><NexioAvatar size={28} /></div>
            <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="text-accent animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5 text-center">
              {error}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Preguntale a Nexio AI..."
            disabled={loading}
            className="flex-1 bg-surface border border-border focus:border-accent/40 rounded-xl px-4 py-3 text-sm placeholder:text-secondary/40 focus:outline-none transition-colors resize-none disabled:opacity-50 max-h-40 overflow-y-auto"
            style={{ minHeight: "44px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent/80 hover:bg-accent disabled:opacity-40 flex items-center justify-center transition-colors text-black"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-secondary/30 text-center mt-2">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}

function NexioAvatar({ size = 32 }: { size?: number }) {
  const s = size;
  return (
    <div
      className="rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center flex-shrink-0"
      style={{ width: s, height: s }}
    >
      <svg width={s * 0.6} height={s * 0.6} viewBox="0 0 56 56" fill="none">
        <path d="M 10 28 A 18 18 0 0 1 46 28" stroke="#3ECFB2" strokeWidth="3.2" strokeLinecap="round"/>
        <path d="M 16 36 A 12 12 0 0 0 40 20" stroke="#3ECFB2" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <path d="M 20 28 A 8 8 0 0 1 36 28" stroke="#3ECFB2" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
        <circle cx="28" cy="28" r="4" fill="#3ECFB2"/>
        <circle cx="10" cy="28" r="2.8" fill="#3ECFB2" opacity="0.5"/>
        <circle cx="46" cy="28" r="2.8" fill="#3ECFB2"/>
      </svg>
    </div>
  );
}
