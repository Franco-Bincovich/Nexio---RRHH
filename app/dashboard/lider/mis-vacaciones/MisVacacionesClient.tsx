"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Plus, Umbrella } from "lucide-react";
import { solicitarVacacionesLider } from "./actions";
import { Badge, EmptyState } from "@/components/ui";

type EstadoSol = "pendiente" | "aprobada" | "rechazada";

export type VacacionesRow = {
  id:               string;
  fecha_desde:      string;
  fecha_hasta:      string;
  dias:             number | null;
  comentario:       string | null;
  estado:           EstadoSol;
  created_at:       string;
  aprobador_nombre: string | null;
  motivo_rechazo:   string | null;
};

function fmtFecha(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function calcDias(desde: string, hasta: string): number {
  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

interface Props { vacaciones: VacacionesRow[] }

export default function MisVacacionesClient({ vacaciones }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [desde, setDesde]         = useState("");
  const [hasta, setHasta]         = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const diasCalculados = desde && hasta ? calcDias(desde, hasta) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desde || !hasta) return;
    if (hasta < desde) { setError("La fecha de fin no puede ser anterior al inicio."); return; }
    setError("");
    startTransition(async () => {
      const res = await solicitarVacacionesLider({
        fecha_desde: desde,
        fecha_hasta: hasta,
        dias:        diasCalculados,
        comentario:  comentario.trim() || undefined,
      });
      if (res.error) { setError(res.error); }
      else {
        setSuccess(true);
        setDesde(""); setHasta(""); setComentario("");
        setTimeout(() => { setSuccess(false); setMostrarForm(false); }, 1500);
        router.refresh();
      }
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mis vacaciones</h1>
          <p className="text-secondary text-sm">{vacaciones.length} solicitud{vacaciones.length !== 1 ? "es" : ""}</p>
        </div>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setError(""); setSuccess(false); }}
          className="flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={13} />
          Nueva solicitud
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Solicitar vacaciones</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-secondary/60 uppercase tracking-[0.5px] mb-1 block">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  required
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-secondary/60 uppercase tracking-[0.5px] mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  required
                  min={desde}
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            </div>

            {diasCalculados > 0 && (
              <p className="text-xs text-accent font-medium">
                {diasCalculados} día{diasCalculados !== 1 ? "s" : ""} de vacaciones
              </p>
            )}

            <div>
              <label className="text-[11px] text-secondary/60 uppercase tracking-[0.5px] mb-1 block">Comentario (opcional)</label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                placeholder="Alguna aclaración adicional..."
                className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/40 focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-3">
              <AlertCircle size={13} />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-accent text-xs bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mt-3">
              <CheckCircle2 size={13} />Solicitud enviada correctamente.
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-secondary hover:text-white hover:border-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !desde || !hasta}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent/80 hover:bg-accent text-black text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Enviar solicitud
            </button>
          </div>
        </form>
      )}

      {vacaciones.length === 0 ? (
        <EmptyState
          icon={Umbrella}
          titulo="No tenés solicitudes de vacaciones"
          descripcion="Cuando envíes una solicitud, la vas a ver acá con su estado."
        />
      ) : (
        <div className="space-y-3">
          {vacaciones.map((v) => {
            return (
              <div key={v.id} className="bg-surface rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {fmtFecha(v.fecha_desde)} — {fmtFecha(v.fecha_hasta)}
                    </p>
                    <p className="text-xs text-secondary mt-0.5">
                      {v.dias ? `${v.dias} días` : "—"}
                      {v.comentario ? ` · ${v.comentario}` : ""}
                    </p>
                  </div>
                  <Badge estado={v.estado} className="flex-shrink-0" />
                </div>
                {(v.aprobador_nombre || v.motivo_rechazo) && (
                  <p className="text-[11px] text-secondary/50">
                    {v.estado === "aprobada" ? "Aprobadas" : "Rechazadas"}
                    {v.aprobador_nombre ? ` por ${v.aprobador_nombre}` : ""}
                    {v.motivo_rechazo ? ` · ${v.motivo_rechazo}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
