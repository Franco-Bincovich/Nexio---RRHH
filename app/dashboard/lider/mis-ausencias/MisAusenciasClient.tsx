"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Plus, UserX } from "lucide-react";
import { solicitarAusenciaLider } from "./actions";

type EstadoSol = "pendiente" | "aprobada" | "rechazada";

export type AusenciaRow = {
  id:               string;
  fecha:            string;
  subtipo:          string | null;
  motivo:           string | null;
  estado:           EstadoSol;
  created_at:       string;
  aprobador_nombre: string | null;
  motivo_rechazo:   string | null;
};

const ESTADO_CONFIG: Record<EstadoSol, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pendiente: { label: "Pendiente", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  aprobada:  { label: "Aprobada",  color: "text-accent",     bg: "bg-accent/10 border-accent/20",         icon: CheckCircle2 },
  rechazada: { label: "Rechazada", color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20",       icon: XCircle },
};

const SUBTIPOS = ["Enfermedad", "Trámite personal", "Familiar", "Otro"];

function fmtFecha(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

interface Props { ausencias: AusenciaRow[] }

export default function MisAusenciasClient({ ausencias }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [fecha, setFecha]   = useState("");
  const [subtipo, setSubtipo] = useState(SUBTIPOS[0]);
  const [motivo, setMotivo] = useState("");
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha || !motivo.trim()) return;
    setError("");
    startTransition(async () => {
      const res = await solicitarAusenciaLider({ fecha, subtipo, motivo: motivo.trim() });
      if (res.error) { setError(res.error); }
      else {
        setSuccess(true);
        setFecha(""); setMotivo(""); setSubtipo(SUBTIPOS[0]);
        setTimeout(() => { setSuccess(false); setMostrarForm(false); }, 1500);
        router.refresh();
      }
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mis inasistencias</h1>
          <p className="text-secondary text-sm">{ausencias.length} solicitud{ausencias.length !== 1 ? "es" : ""}</p>
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
        <form onSubmit={handleSubmit} className="bg-surface border border-[#1A2235] rounded-xl p-5 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
          <h2 className="text-sm font-semibold mb-4">Nueva inasistencia</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-secondary/60 uppercase tracking-[0.5px] mb-1 block">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-secondary/60 uppercase tracking-[0.5px] mb-1 block">Tipo</label>
              <select
                value={subtipo}
                onChange={(e) => setSubtipo(e.target.value)}
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors"
              >
                {SUBTIPOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-secondary/60 uppercase tracking-[0.5px] mb-1 block">Motivo</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                required
                placeholder="Describí el motivo..."
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/40 focus:outline-none focus:border-accent/50 transition-colors resize-none"
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
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#1A2235] text-sm text-secondary hover:text-white hover:border-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !fecha || !motivo.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent/80 hover:bg-accent text-black text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Enviar solicitud
            </button>
          </div>
        </form>
      )}

      {ausencias.length === 0 ? (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] py-16 text-center">
          <UserX size={28} className="text-secondary/25 mx-auto mb-3" />
          <p className="text-sm text-secondary/60">No tenés solicitudes de inasistencia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ausencias.map((a) => {
            const cfg = ESTADO_CONFIG[a.estado];
            const EstadoIcon = cfg.icon;
            return (
              <div key={a.id} className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold">{fmtFecha(a.fecha)}</p>
                    <p className="text-xs text-secondary mt-0.5">{a.subtipo ?? "—"} · {a.motivo ?? "—"}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.5px] px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                    <EstadoIcon size={10} />
                    {cfg.label}
                  </span>
                </div>
                {(a.aprobador_nombre || a.motivo_rechazo) && (
                  <p className="text-[11px] text-secondary/50">
                    {a.estado === "aprobada" ? "Aprobada" : "Rechazada"}
                    {a.aprobador_nombre ? ` por ${a.aprobador_nombre}` : ""}
                    {a.motivo_rechazo ? ` · ${a.motivo_rechazo}` : ""}
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
