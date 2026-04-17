"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2, AlertCircle, Clock, Sun } from "lucide-react";
import { crearVacaciones } from "./actions";

export type Solicitud = {
  id: string;
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  comentario: string | null;
  estado: string;
  created_at: string;
};

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  aprobada:   { label: "Aprobada",   color: "text-accent bg-accent/10 border-accent/20" },
  rechazada:  { label: "Rechazada",  color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

function calcularDias(desde: string, hasta: string): number {
  if (!desde || !hasta) return 0;
  const d = new Date(desde + "T00:00:00");
  const h = new Date(hasta + "T00:00:00");
  const diff = Math.round((h.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff + 1 : 0;
}

export default function VacacionesClient({ solicitudes, hoy }: { solicitudes: Solicitud[]; hoy: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [comentario, setComentario] = useState("");

  const dias = calcularDias(fechaDesde, fechaHasta);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (dias < 1) { setMsg({ error: "La fecha hasta debe ser igual o posterior a la fecha desde." }); return; }
    startTransition(async () => {
      const res = await crearVacaciones({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, dias, comentario: comentario || undefined });
      if (res.ok) {
        setMsg({ ok: true });
        setFechaDesde(hoy);
        setFechaHasta(hoy);
        setComentario("");
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
          Solicitar vacaciones
        </button>
      )}

      {msg?.ok && !showForm && (
        <div className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} />
          Solicitud enviada correctamente
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A2235]">
            <h2 className="text-sm font-semibold">Solicitar vacaciones</h2>
            <button onClick={() => setShowForm(false)} className="text-secondary hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Fecha desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  required
                  className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Fecha hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  required
                  className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>
            </div>

            {/* Días calculados */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${dias > 0 ? "bg-accent/5 border-accent/20 text-accent" : "bg-white/[0.02] border-[#1A2235] text-secondary"}`}>
              <Sun size={14} />
              <span className="text-sm font-medium">
                {dias > 0 ? `${dias} día${dias !== 1 ? "s" : ""} de vacaciones` : "Seleccioná las fechas"}
              </span>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">
                Comentario <span className="normal-case tracking-normal text-secondary/50">(opcional)</span>
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                placeholder="Algún comentario o aclaración..."
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2 text-sm text-white placeholder-secondary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
              />
            </div>

            {msg?.error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} />{msg.error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-secondary hover:text-white transition-colors px-4 py-2">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || dias < 1}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-base text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Enviar solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Historial</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}</span>
        </div>
        {solicitudes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-secondary/60">No hay vacaciones registradas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#1A2235]">
            {solicitudes.map((s) => {
              const estado = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.pendiente;
              const desde = new Date(s.fecha_desde + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
              const hasta = new Date(s.fecha_hasta + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
              return (
                <li key={s.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{desde} → {hasta}</p>
                        <span className="flex items-center gap-1 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          <Sun size={9} />
                          {s.dias} días
                        </span>
                      </div>
                      {s.comentario && (
                        <p className="text-xs text-secondary/70 line-clamp-1">{s.comentario}</p>
                      )}
                      <p className="text-[10px] text-secondary/40 mt-1">
                        Enviada el {new Date(s.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
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
