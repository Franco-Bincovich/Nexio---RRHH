"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { crearRetiro } from "./actions";

type Solicitud = {
  id: string;
  fecha: string;
  hora_retiro: string;
  motivo: string;
  estado: string;
  created_at: string;
};

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  aprobada:   { label: "Aprobada",   color: "text-accent bg-accent/10 border-accent/20" },
  rechazada:  { label: "Rechazada",  color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

export default function RetirosClient({ solicitudes, hoy }: { solicitudes: Solicitud[]; hoy: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState("16:00");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await crearRetiro({ fecha, hora_retiro: hora, motivo });
      if (res.ok) {
        setMsg({ ok: true });
        setMotivo("");
        setFecha(hoy);
        setHora("16:00");
        setShowForm(false);
        router.refresh();
      } else {
        setMsg({ error: res.error });
      }
    });
  }

  return (
    <div className="space-y-5">
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setMsg(null); }}
          className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nuevo retiro anticipado
        </button>
      )}

      {msg?.ok && !showForm && (
        <div className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} />
          Solicitud enviada correctamente
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Nuevo retiro anticipado</h2>
            <button onClick={() => setShowForm(false)} className="text-secondary hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Hora de retiro</label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">
                Motivo <span className="normal-case tracking-normal text-secondary/50">(mínimo 20 caracteres)</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                required
                placeholder="Describí el motivo del retiro anticipado..."
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-secondary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
              />
              <p className={`text-[10px] mt-1 ${motivo.length < 20 ? "text-secondary/50" : "text-accent"}`}>
                {motivo.length}/20 caracteres mínimos
              </p>
            </div>
            {msg?.error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} />{msg.error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-secondary hover:text-foreground transition-colors px-4 py-2">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || motivo.length < 20}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Enviar solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Historial</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}</span>
        </div>
        {solicitudes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-secondary/60">No hay retiros registrados.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {solicitudes.map((s) => {
              const estado = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.pendiente;
              return (
                <li key={s.id} className="px-5 py-4 hover:bg-border/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {new Date(s.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                        <span className="text-[10px] text-secondary/60 bg-white/5 px-2 py-0.5 rounded-full">
                          {s.hora_retiro.slice(0, 5)} hs
                        </span>
                      </div>
                      <p className="text-xs text-secondary/70 line-clamp-2">{s.motivo}</p>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-[0.5px] px-2.5 py-1 rounded-full border ${estado.color}`}>
                      {estado.label}
                    </span>
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
