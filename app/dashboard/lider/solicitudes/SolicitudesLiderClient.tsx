"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, Clock, X, Loader2, AlertCircle,
  FileText, UserX, DoorOpen, Umbrella,
} from "lucide-react";
import { resolverSolicitud } from "./actions";

type TipoSol = "ausencia" | "retiro" | "vacaciones";
type EstadoSol = "pendiente" | "aprobada" | "rechazada";
type TabSol = "todas" | "ausencias" | "retiros" | "vacaciones";

export type SolicitudNorm = {
  id: string;
  tipo: TipoSol;
  empleado_id: string;
  empleado_nombre: string;
  estado: EstadoSol;
  created_at: string;
  aprobador_nombre: string | null;
  motivo_rechazo: string | null;
  // ausencia
  fecha?: string;
  motivo?: string;
  subtipo?: string;
  // retiro
  hora_retiro?: string;
  // vacaciones
  fecha_desde?: string;
  fecha_hasta?: string;
  dias?: number;
  comentario?: string;
};

const ESTADO_CONFIG: Record<EstadoSol, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pendiente: { label: "Pendiente",  color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  aprobada:  { label: "Aprobada",   color: "text-accent",     bg: "bg-accent/10 border-accent/20",         icon: CheckCircle2 },
  rechazada: { label: "Rechazada",  color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20",       icon: XCircle },
};

const TIPO_ICON: Record<TipoSol, React.ElementType> = {
  ausencia:   UserX,
  retiro:     DoorOpen,
  vacaciones: Umbrella,
};

const TIPO_LABEL: Record<TipoSol, string> = {
  ausencia:   "Inasistencia",
  retiro:     "Retiro anticipado",
  vacaciones: "Vacaciones",
};

interface Props {
  solicitudes: SolicitudNorm[];
}

function fmtFecha(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function SolicitudesLiderClient({ solicitudes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabSol>("todas");
  const [rechazando, setRechazando] = useState<SolicitudNorm | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [actionError, setActionError] = useState("");

  const filtradas = solicitudes.filter((s) => {
    if (tab === "todas")      return true;
    if (tab === "ausencias")  return s.tipo === "ausencia";
    if (tab === "retiros")    return s.tipo === "retiro";
    if (tab === "vacaciones") return s.tipo === "vacaciones";
    return true;
  });

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;

  function handleAprobar(sol: SolicitudNorm) {
    setActionError("");
    startTransition(async () => {
      const res = await resolverSolicitud({
        solicitudId:    sol.id,
        tipo:           sol.tipo,
        decision:       "aprobada",
        empleadoId:     sol.empleado_id,
        empleadoNombre: sol.empleado_nombre,
      });
      if (res.error) setActionError(res.error);
      else router.refresh();
    });
  }

  function handleConfirmarRechazo() {
    if (!rechazando || !motivoRechazo.trim()) return;
    setActionError("");
    startTransition(async () => {
      const res = await resolverSolicitud({
        solicitudId:    rechazando.id,
        tipo:           rechazando.tipo,
        decision:       "rechazada",
        motivoRechazo:  motivoRechazo.trim(),
        empleadoId:     rechazando.empleado_id,
        empleadoNombre: rechazando.empleado_nombre,
      });
      if (res.error) { setActionError(res.error); }
      else { setRechazando(null); setMotivoRechazo(""); router.refresh(); }
    });
  }

  const tabs: { value: TabSol; label: string }[] = [
    { value: "todas",      label: "Todas" },
    { value: "ausencias",  label: "Inasistencias" },
    { value: "retiros",    label: "Retiros" },
    { value: "vacaciones", label: "Vacaciones" },
  ];

  return (
    <>
      <div className="p-4 md:p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Solicitudes del área</h1>
          <p className="text-secondary text-sm">
            {solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}
            {pendientes > 0 && <span className="text-yellow-400 ml-2">· {pendientes} pendiente{pendientes !== 1 ? "s" : ""}</span>}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface border border-[#1A2235] rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.value
                  ? "bg-accent/15 text-accent border border-accent/20"
                  : "text-secondary hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={13} />{actionError}
          </div>
        )}

        {filtradas.length === 0 ? (
          <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] py-16 text-center">
            <FileText size={28} className="text-secondary/25 mx-auto mb-3" />
            <p className="text-sm text-secondary/60">No hay solicitudes{tab !== "todas" ? " en esta categoría" : ""}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtradas.map((sol) => {
              const estadoCfg = ESTADO_CONFIG[sol.estado];
              const EstadoIcon = estadoCfg.icon;
              const TipoIcon = TIPO_ICON[sol.tipo];
              return (
                <div
                  key={`${sol.tipo}-${sol.id}`}
                  className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TipoIcon size={14} className="text-secondary flex-shrink-0" />
                      <span className="text-xs font-semibold text-secondary uppercase tracking-[0.5px]">
                        {TIPO_LABEL[sol.tipo]}
                      </span>
                      <span className="text-secondary/40 text-xs">·</span>
                      <span className="text-sm font-semibold">{sol.empleado_nombre}</span>
                      <span className="text-secondary/40 text-xs">·</span>
                      <span className="text-[10px] text-secondary/50">{fmtFecha(sol.created_at.split("T")[0])}</span>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.5px] px-2.5 py-1 rounded-full border flex-shrink-0 ${estadoCfg.bg} ${estadoCfg.color}`}>
                      <EstadoIcon size={10} />
                      {estadoCfg.label}
                    </span>
                  </div>

                  {/* Detalles */}
                  <div className="bg-white/[0.02] border border-[#1A2235] rounded-lg px-4 py-3 space-y-1.5 mb-3">
                    {sol.tipo === "ausencia" && (
                      <>
                        <DetailRow label="Fecha"  value={fmtFecha(sol.fecha!)} />
                        <DetailRow label="Tipo"   value={sol.subtipo ?? "—"} />
                        <DetailRow label="Motivo" value={sol.motivo ?? "—"} />
                      </>
                    )}
                    {sol.tipo === "retiro" && (
                      <>
                        <DetailRow label="Fecha"  value={fmtFecha(sol.fecha!)} />
                        <DetailRow label="Hora"   value={sol.hora_retiro?.slice(0, 5) ?? "—"} />
                        <DetailRow label="Motivo" value={sol.motivo ?? "—"} />
                      </>
                    )}
                    {sol.tipo === "vacaciones" && (
                      <>
                        <DetailRow label="Desde"      value={fmtFecha(sol.fecha_desde!)} />
                        <DetailRow label="Hasta"      value={fmtFecha(sol.fecha_hasta!)} />
                        <DetailRow label="Días"       value={`${sol.dias}`} />
                        {sol.comentario && <DetailRow label="Comentario" value={sol.comentario} />}
                      </>
                    )}
                  </div>

                  {/* Resolución o acciones */}
                  {sol.estado === "pendiente" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAprobar(sol)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => { setRechazando(sol); setMotivoRechazo(""); }}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        Rechazar
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-secondary/50">
                      {sol.estado === "aprobada" ? "Aprobada" : "Rechazada"}
                      {sol.aprobador_nombre ? ` por ${sol.aprobador_nombre}` : ""}
                      {sol.motivo_rechazo ? ` · ${sol.motivo_rechazo}` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal rechazo */}
      {rechazando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRechazando(null)} />
          <div className="relative bg-surface border border-[#1A2235] rounded-xl w-full max-w-sm p-6 shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Rechazar solicitud</h2>
              <button onClick={() => setRechazando(null)} className="text-secondary hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-secondary mb-3">
              Rechazando solicitud de <span className="text-white font-medium">{rechazando.empleado_nombre}</span>.
              El motivo se enviará como notificación al empleado.
            </p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={4}
              placeholder="Indicá el motivo del rechazo..."
              className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/40 focus:outline-none focus:border-accent/50 transition-colors resize-none mb-1"
            />
            <p className="text-[10px] text-secondary/40 mb-4 text-right">{motivoRechazo.length} caracteres</p>
            {actionError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">
                {actionError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setRechazando(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#1A2235] text-sm text-secondary hover:text-white hover:border-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRechazo}
                disabled={isPending || !motivoRechazo.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[11px] text-secondary/50 w-20 flex-shrink-0">{label}</span>
      <span className="text-xs text-secondary leading-relaxed">{value}</span>
    </div>
  );
}
