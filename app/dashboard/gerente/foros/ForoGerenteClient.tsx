"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, MessageSquare, Users, Building2 } from "lucide-react";
import { enviarMensajeGerente } from "./actions";

type TabForo = "gerencia" | "rrhh";

type Mensaje = {
  id:          string;
  autor_id:    string;
  autor_nombre: string;
  autor_rol:   string;
  mensaje:     string;
  created_at:  string;
  foro_tipo:   string;
};

interface Props {
  mensajesGerencia: Mensaje[];
  mensajesRrhh:     Mensaje[];
  gerenteId:        string;
}

const TAB_CONFIG: Record<TabForo, { label: string; icon: React.ElementType }> = {
  gerencia: { label: "Líderes",       icon: Users },
  rrhh:     { label: "Organización",  icon: Building2 },
};

function fmtFecha(iso: string) {
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-");
  const [hh, mm] = (time ?? "").split(":");
  return `${d}/${m} ${hh}:${mm}`;
}

export default function ForoGerenteClient({ mensajesGerencia, mensajesRrhh, gerenteId }: Props) {
  const router = useRouter();
  const [tab, setTab]     = useState<TabForo>("gerencia");
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const mensajes = tab === "gerencia" ? mensajesGerencia : mensajesRrhh;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, tab]);

  function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setError("");
    startTransition(async () => {
      const res = await enviarMensajeGerente({ mensaje: texto.trim(), foroTipo: tab });
      if (res.error) setError(res.error);
      else { setTexto(""); router.refresh(); }
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Comunicaciones</h1>
      <p className="text-secondary text-sm mb-6">Canales de comunicación de la empresa</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1 w-fit">
        {(Object.entries(TAB_CONFIG) as [TabForo, typeof TAB_CONFIG[TabForo]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === key ? "bg-accent/15 text-accent border border-accent/20" : "text-secondary hover:text-white"
              }`}
            >
              <Icon size={13} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Mensajes */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden mb-4">
        {mensajes.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare size={24} className="text-secondary/25 mx-auto mb-2" />
            <p className="text-sm text-secondary/60">No hay mensajes todavía. Sé el primero en escribir.</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {mensajes.map((m) => {
              const esPropio = m.autor_id === gerenteId;
              return (
                <div key={m.id} className={`px-5 py-3.5 ${esPropio ? "bg-accent/[0.03]" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[9px] font-bold text-accent flex-shrink-0">
                      {m.autor_nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                    </div>
                    <span className="text-xs font-medium">{m.autor_nombre}</span>
                    <span className="text-[10px] text-secondary/50">{m.autor_rol}</span>
                    <span className="ml-auto text-[10px] text-secondary/40">{fmtFecha(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed pl-8">{m.mensaje}</p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleEnviar} className="flex gap-3">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`Escribir en ${TAB_CONFIG[tab].label}...`}
          className="flex-1 bg-surface border border-border focus:border-accent/40 rounded-xl px-4 py-3 text-sm placeholder:text-secondary/40 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={isPending || !texto.trim()}
          className="w-10 h-10 mt-0.5 rounded-xl bg-accent/80 hover:bg-accent disabled:opacity-40 flex items-center justify-center transition-colors text-black flex-shrink-0"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
