"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Thermometer, CheckCircle2, AlertCircle, Loader2, Send, History } from "lucide-react";
import { enviarTemperatura } from "./actions";

type Respuesta = {
  id: string;
  puntuacion: number;
  comentario: string | null;
  semana: string;
  created_at: string;
};

const SCORE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1:  { label: "Muy mal",       color: "text-red-500",    bg: "bg-red-500/20 border-red-500/40" },
  2:  { label: "Mal",           color: "text-red-400",    bg: "bg-red-400/20 border-red-400/40" },
  3:  { label: "Regular",       color: "text-orange-400", bg: "bg-orange-400/20 border-orange-400/40" },
  4:  { label: "Algo bajo",     color: "text-orange-300", bg: "bg-orange-300/15 border-orange-300/30" },
  5:  { label: "Normal",        color: "text-yellow-400", bg: "bg-yellow-400/15 border-yellow-400/30" },
  6:  { label: "Bien",          color: "text-yellow-300", bg: "bg-yellow-300/15 border-yellow-300/30" },
  7:  { label: "Bastante bien", color: "text-lime-400",   bg: "bg-lime-400/15 border-lime-400/30" },
  8:  { label: "Muy bien",      color: "text-green-400",  bg: "bg-green-400/15 border-green-400/30" },
  9:  { label: "Excelente",     color: "text-accent",     bg: "bg-accent/15 border-accent/30" },
  10: { label: "Excepcional",   color: "text-accent",     bg: "bg-accent/20 border-accent/50" },
};

interface Props {
  historial: Respuesta[];
}

export default function TemperaturaClient({ historial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [score, setScore] = useState<number>(0);
  const [comentario, setComentario] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (score === 0) { setMsg({ error: "Seleccioná una puntuación." }); return; }
    setMsg(null);
    startTransition(async () => {
      const res = await enviarTemperatura({ puntuacion: score, comentario: comentario || undefined });
      if (res.ok) {
        setScore(0);
        setComentario("");
        setMsg({ ok: true });
        router.refresh();
      } else {
        setMsg({ error: res.error });
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Formulario */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Thermometer size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">¿Cómo te sentiste esta semana?</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          <div>
            <p className="text-sm text-secondary mb-3">Seleccioná tu puntuación del 1 al 10</p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => {
                const cfg = SCORE_CONFIG[n];
                const active = score === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(n)}
                    className={`h-10 rounded-lg border-2 font-bold text-sm transition-all ${
                      active
                        ? `${cfg.bg} ${cfg.color} scale-110 shadow-lg`
                        : "bg-white/[0.03] border-border text-secondary hover:border-white/20 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {score > 0 && (
              <p className={`text-xs mt-2 font-medium ${SCORE_CONFIG[score]?.color}`}>
                {SCORE_CONFIG[score]?.label}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">
              Comentario <span className="normal-case tracking-normal text-secondary/40">(opcional, anónimo)</span>
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="¿Algo que quieras compartir sobre esta semana?"
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-secondary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
            />
            <p className="text-[10px] text-secondary/40 mt-1 text-right">{comentario.length}/500</p>
          </div>

          {msg?.error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} />{msg.error}
            </div>
          )}

          {msg?.ok && (
            <div className="flex items-center gap-2 text-accent text-xs bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              <CheckCircle2 size={13} />Respuesta enviada correctamente.
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || score === 0}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Enviar respuesta
          </button>
        </form>
      </div>

      {/* Historial */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <History size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Mi historial</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{historial.length} respuesta{historial.length !== 1 ? "s" : ""}</span>
        </div>

        {historial.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-secondary/60">Todavía no enviaste ninguna respuesta.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {historial.map((r) => {
              const cfg = SCORE_CONFIG[r.puntuacion];
              const fecha = new Date(r.created_at).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li key={r.id} className="px-5 py-4 flex items-center gap-4 hover:bg-border/20 transition-colors">
                  <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-base font-extrabold flex-shrink-0 ${cfg?.bg ?? "bg-accent/10 border-accent/20"} ${cfg?.color ?? "text-accent"}`}>
                    {r.puntuacion}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${cfg?.color ?? "text-accent"}`}>{cfg?.label ?? r.puntuacion}</p>
                    <p className="text-[10px] text-secondary/50 mt-0.5">{fecha}</p>
                    {r.comentario && (
                      <p className="text-xs text-secondary/70 mt-1 line-clamp-1">{r.comentario}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
