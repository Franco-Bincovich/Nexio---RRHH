"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, AlertCircle, MessageSquare, Users, Shield } from "lucide-react";
import { enviarMensaje } from "./actions";

type Mensaje = {
  id: string;
  mensaje: string;
  created_at: string;
  area_id: string | null;
  autor: { nombre: string; rol: string } | null;
};

type Tab = "area" | "rrhh";

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "ahora";
  if (mins < 60)  return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7)   return `hace ${days} día${days > 1 ? "s" : ""}`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function initials(nombre: string): string {
  return nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const ROL_BADGE: Record<string, string> = {
  rrhh:    "bg-blue-500/15 text-blue-400",
  lider:   "bg-purple-500/15 text-purple-400",
  gerente: "bg-accent/15 text-accent",
};

interface Props {
  mensajesArea: Mensaje[];
  mensajesRrhh: Mensaje[];
  areaNombre: string | null;
  areaId: string | null;
  empleadoNombre: string;
}

export default function ForoClient({ mensajesArea, mensajesRrhh, areaNombre, areaId, empleadoNombre }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("area");
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ error?: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const mensajes = tab === "area" ? mensajesArea : mensajesRrhh;
  const currentAreaId = tab === "area" ? areaId : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    if (tab === "area" && !areaId) {
      setMsg({ error: "No tenés un área asignada." });
      return;
    }
    setMsg(null);
    const snapshot = texto;
    setTexto("");
    startTransition(async () => {
      const res = await enviarMensaje({ mensaje: snapshot, areaId: currentAreaId });
      if (res.error) {
        setMsg({ error: res.error });
        setTexto(snapshot);
      } else {
        router.refresh();
      }
    });
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [texto]);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface border border-[#1A2235] rounded-xl p-1 w-fit">
        <TabBtn
          active={tab === "area"}
          onClick={() => setTab("area")}
          icon={<Users size={13} />}
          label={areaNombre ? `${areaNombre}` : "Mi área"}
        />
        <TabBtn
          active={tab === "rrhh"}
          onClick={() => setTab("rrhh")}
          icon={<Shield size={13} />}
          label="Foro RRHH"
        />
      </div>

      {/* Lista de mensajes */}
      <div
        ref={listRef}
        className="flex-1 bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-y-auto mb-3 flex flex-col"
      >
        {mensajes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-5 text-center">
            <MessageSquare size={28} className="text-secondary/25 mb-3" />
            <p className="text-sm text-secondary/60">
              {tab === "area"
                ? "Todavía no hay mensajes en el foro del área."
                : "Todavía no hay mensajes en el foro de RRHH."}
            </p>
            <p className="text-xs text-secondary/40 mt-1">Sé el primero en escribir.</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {[...mensajes].reverse().map((m) => {
              const nombre = m.autor?.nombre ?? "Empleado";
              const rol = m.autor?.rol ?? "empleado";
              const esRrhh = rol === "rrhh";
              return (
                <div key={m.id} className="flex gap-3">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${esRrhh ? "bg-blue-500/15 border border-blue-500/25 text-blue-400" : "bg-accent/10 border border-accent/20 text-accent"}`}>
                    {initials(nombre)}
                  </div>
                  {/* Burbuja */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold">{nombre}</span>
                      {rol !== "empleado" && (
                        <span className={`text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full ${ROL_BADGE[rol] ?? "bg-white/5 text-secondary"}`}>
                          {rol === "rrhh" ? "RRHH" : rol === "lider" ? "Líder" : "Gerente"}
                        </span>
                      )}
                      <span className="text-[10px] text-secondary/40 ml-auto">{tiempoRelativo(m.created_at)}</span>
                    </div>
                    <div className="bg-white/[0.03] border border-[#1A2235] rounded-xl rounded-tl-sm px-3.5 py-2.5">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.mensaje}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="bg-surface border border-[#1A2235] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-3 flex gap-3 items-end">
        <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0 mb-0.5">
          {initials(empleadoNombre)}
        </div>
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }
          }}
          rows={1}
          maxLength={2000}
          placeholder={tab === "area" ? `Escribí algo en ${areaNombre ?? "tu área"}...` : "Escribí algo en el foro de RRHH..."}
          className="flex-1 bg-transparent text-sm text-white placeholder-secondary/40 outline-none resize-none leading-relaxed"
        />
        <button
          type="submit"
          disabled={isPending || !texto.trim()}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent hover:bg-accent/90 disabled:opacity-40 flex items-center justify-center transition-colors mb-0.5"
          aria-label="Enviar"
        >
          {isPending ? <Loader2 size={14} className="animate-spin text-base" /> : <Send size={14} className="text-base" />}
        </button>
      </form>

      {msg?.error && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-2">
          <AlertCircle size={13} />{msg.error}
        </div>
      )}

      <p className="text-[10px] text-secondary/30 mt-2 text-center">
        Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-accent/15 text-accent border border-accent/20"
          : "text-secondary hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
