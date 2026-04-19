"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, Clock, X, Loader2, AlertCircle,
  FileText, UserX, DoorOpen, Umbrella, Users, User,
} from "lucide-react";
import { resolverSolicitudLider } from "./actions";

type TipoSol  = "ausencia" | "retiro" | "vacaciones";
type EstadoSol = "pendiente" | "aprobada" | "rechazada";
type MainTab  = "empleados" | "lideres";
type SubTab   = "todas" | "ausencias" | "retiros" | "vacaciones";

export type SolicitudNorm = {
  id:               string;
  tipo:             TipoSol;
  empleado_id:      string;
  empleado_nombre:  string;
  empleado_rol:     string;
  area_nombre:      string | null;
  estado:           EstadoSol;
  created_at:       string;
  aprobador_nombre: string | null;
  motivo_rechazo:   string | null;
  fecha?:           string;
  motivo?:          string;
  subtipo?:         string;
  hora_retiro?:     string;
  fecha_desde?:     string;
  fecha_hasta?:     string;
  dias?:            number;
  comentario?:      string;
};

const ESTADO_CONFIG: Record<EstadoSol, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pendiente: { label: "Pendiente", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  aprobada:  { label: "Aprobada",  color: "text-accent",     bg: "bg-accent/10 border-accent/20",         icon: CheckCircle2 },
  rechazada: { label: "Rechazada", color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20",       icon: XCircle },
};
const TIPO_ICON: Record<TipoSol, React.ElementType> = { ausencia: UserX, retiro: DoorOpen, vacaciones: Umbrella };
const TIPO_LABEL: Record<TipoSol, string> = { ausencia: "Inasistencia", retiro: "Retiro anticipado", vacaciones: "Vacaciones" };

function fmtFecha(s: string) { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; }

interface Props { solicitudes: SolicitudNorm[] }

function SolicitudCard({
  sol,
  showActions,
  onAprobar,
  onRechazar,
  isPending,
}: {
  sol: SolicitudNorm;
  showActions: boolean;
  onAprobar?: () => void;
  onRechazar?: () => void;
  isPending: boolean;
}) {
  const estadoCfg = ESTADO_CONFIG[sol.estado];
  const EstIcon = estadoCfg.icon;
  const TipoIcon = TIPO_ICON[sol.tipo];
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <TipoIcon size={14} className="text-secondary flex-shrink-0" />
          <span className="text-xs font-semibold text-secondary uppercase tracking-[0.5px]">{TIPO_LABEL[sol.tipo]}</span>
          <span className="text-secondary/40 text-xs">·</span>
          <span className="text-sm font-semibold">{sol.empleado_nombre}</span>
          {sol.area_nombre && <span className="text-[10px] text-secondary/50 bg-white/5 px-2 py-0.5 rounded-full">{sol.area_nombre}</span>}
          <span className="text-[10px] text-secondary/40">{fmtFecha(sol.created_at.split("T")[0])}</span>
        </div>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.5px] px-2.5 py-1 rounded-full border flex-shrink-0 ${estadoCfg.bg} ${estadoCfg.color}`}>
          <EstIcon size={10} />{estadoCfg.label}
        </span>
      </div>
      <div className="bg-white/[0.02] border border-border rounded-lg px-4 py-3 space-y-1.5 mb-3 text-xs">
        {sol.tipo === "ausencia" && (<><DetailRow label="Fecha" value={fmtFecha(sol.fecha!)} /><DetailRow label="Tipo" value={sol.subtipo ?? "—"} /><DetailRow label="Motivo" value={sol.motivo ?? "—"} /></>)}
        {sol.tipo === "retiro" && (<><DetailRow label="Fecha" value={fmtFecha(sol.fecha!)} /><DetailRow label="Hora" value={sol.hora_retiro?.slice(0,5) ?? "—"} /><DetailRow label="Motivo" value={sol.motivo ?? "—"} /></>)}
        {sol.tipo === "vacaciones" && (<><DetailRow label="Desde" value={fmtFecha(sol.fecha_desde!)} /><DetailRow label="Hasta" value={fmtFecha(sol.fecha_hasta!)} /><DetailRow label="Días" value={`${sol.dias}`} />{sol.comentario && <DetailRow label="Comentario" value={sol.comentario} />}</>)}
      </div>
      {showActions && sol.estado === "pendiente" ? (
        <div className="flex gap-2">
          <button onClick={onAprobar} disabled={isPending} className="flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}Aprobar
          </button>
          <button onClick={onRechazar} disabled={isPending} className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
            <XCircle size={12} />Rechazar
          </button>
        </div>
      ) : sol.estado !== "pendiente" ? (
        <p className="text-[11px] text-secondary/50">
          {sol.estado === "aprobada" ? "Aprobada" : "Rechazada"}
          {sol.aprobador_nombre ? ` por ${sol.aprobador_nombre}` : ""}
          {sol.motivo_rechazo ? ` · ${sol.motivo_rechazo}` : ""}
        </p>
      ) : null}
    </div>
  );
}

export default function SolicitudesGerenteClient({ solicitudes }: Props) {
  const router = useRouter();
  const [mainTab,      setMainTab]      = useState<MainTab>("lideres");
  const [subTab,       setSubTab]       = useState<SubTab>("todas");
  const [rechazando,   setRechazando]   = useState<SolicitudNorm | null>(null);
  const [motivoRec,    setMotivoRec]    = useState("");
  const [actionError,  setActionError]  = useState("");
  const [isPending,    startTransition] = useTransition();

  const empleados = solicitudes.filter((s) => s.empleado_rol === "empleado");
  const lideres   = solicitudes.filter((s) => s.empleado_rol === "lider");
  const pending   = lideres.filter((s) => s.estado === "pendiente").length;

  function filtrar(list: SolicitudNorm[]) {
    if (subTab === "todas")      return list;
    if (subTab === "ausencias")  return list.filter((s) => s.tipo === "ausencia");
    if (subTab === "retiros")    return list.filter((s) => s.tipo === "retiro");
    if (subTab === "vacaciones") return list.filter((s) => s.tipo === "vacaciones");
    return list;
  }

  const current  = mainTab === "empleados" ? filtrar(empleados) : filtrar(lideres);
  const subtabs: { value: SubTab; label: string }[] = [
    { value: "todas",      label: "Todas" },
    { value: "ausencias",  label: "Inasistencias" },
    { value: "retiros",    label: "Retiros" },
    { value: "vacaciones", label: "Vacaciones" },
  ];

  function handleAprobar(sol: SolicitudNorm) {
    setActionError("");
    startTransition(async () => {
      const res = await resolverSolicitudLider({
        solicitudId:     sol.id,
        tipo:            sol.tipo,
        decision:        "aprobada",
        liderNombre:     sol.empleado_nombre,
        liderEmpleadoId: sol.empleado_id,
      });
      if (res.error) setActionError(res.error);
      else router.refresh();
    });
  }

  function handleConfirmarRechazo() {
    if (!rechazando || !motivoRec.trim()) return;
    setActionError("");
    startTransition(async () => {
      const res = await resolverSolicitudLider({
        solicitudId:     rechazando.id,
        tipo:            rechazando.tipo,
        decision:        "rechazada",
        motivoRechazo:   motivoRec.trim(),
        liderNombre:     rechazando.empleado_nombre,
        liderEmpleadoId: rechazando.empleado_id,
      });
      if (res.error) setActionError(res.error);
      else { setRechazando(null); setMotivoRec(""); router.refresh(); }
    });
  }

  return (
    <>
      <div className="p-4 md:p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Solicitudes</h1>
          <p className="text-secondary text-sm">
            {solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}
            {pending > 0 && <span className="text-yellow-400 ml-2">· {pending} pendiente{pending !== 1 ? "s" : ""} de líderes</span>}
          </p>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 mb-5 bg-surface border border-border rounded-xl p-1 w-fit">
          <button
            onClick={() => setMainTab("lideres")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mainTab === "lideres" ? "bg-accent/15 text-accent border border-accent/20" : "text-secondary hover:text-white"}`}
          >
            <Users size={13} />Líderes
            {pending > 0 && (
              <span className="ml-1 text-[9px] font-bold bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none">{pending}</span>
            )}
          </button>
          <button
            onClick={() => setMainTab("empleados")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mainTab === "empleados" ? "bg-accent/15 text-accent border border-accent/20" : "text-secondary hover:text-white"}`}
          >
            <User size={13} />Empleados
          </button>
        </div>

        {/* Sub tabs */}
        <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1 w-fit">
          {subtabs.map((t) => (
            <button key={t.value} onClick={() => setSubTab(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subTab === t.value ? "bg-accent/15 text-accent border border-accent/20" : "text-secondary hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={13} />{actionError}
          </div>
        )}

        {current.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border py-16 text-center">
            <FileText size={28} className="text-secondary/25 mx-auto mb-3" />
            <p className="text-sm text-secondary/60">No hay solicitudes{subTab !== "todas" ? " en esta categoría" : ""}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {current.map((sol) => (
              <SolicitudCard
                key={`${sol.tipo}-${sol.id}`}
                sol={sol}
                showActions={mainTab === "lideres"}
                onAprobar={() => handleAprobar(sol)}
                onRechazar={() => { setRechazando(sol); setMotivoRec(""); }}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal rechazo */}
      {rechazando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRechazando(null)} />
          <div className="relative bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Rechazar solicitud</h2>
              <button onClick={() => setRechazando(null)} className="text-secondary hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <p className="text-xs text-secondary mb-3">
              Rechazando solicitud de <span className="text-white font-medium">{rechazando.empleado_nombre}</span>. El motivo se enviará como notificación.
            </p>
            <textarea
              value={motivoRec}
              onChange={(e) => setMotivoRec(e.target.value)}
              rows={4}
              placeholder="Indicá el motivo del rechazo..."
              className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/40 focus:outline-none focus:border-accent/50 transition-colors resize-none mb-1"
            />
            <p className="text-[10px] text-secondary/40 mb-4 text-right">{motivoRec.length} caracteres</p>
            {actionError && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setRechazando(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-secondary hover:text-white hover:border-white/20 transition-colors">Cancelar</button>
              <button onClick={handleConfirmarRechazo} disabled={isPending || !motivoRec.trim()} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isPending && <Loader2 size={14} className="animate-spin" />}Rechazar
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
      <span className="text-secondary/50 w-20 flex-shrink-0">{label}</span>
      <span className="text-secondary leading-relaxed">{value}</span>
    </div>
  );
}
