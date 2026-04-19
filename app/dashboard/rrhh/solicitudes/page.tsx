"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import {
  ClipboardList,
  Check,
  X,
  Loader2,
  Calendar,
  Clock,
  FileText,
  ChevronDown,
  Filter,
  Download,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Estado = "pendiente" | "aprobada" | "rechazada";

type SolicitudVacaciones = {
  _tipo: "vacaciones";
  id: string;
  empleado_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  comentario: string | null;
  estado: Estado;
  aprobado_por: string | null;
  created_at: string;
};

type SolicitudAusencia = {
  _tipo: "ausencia";
  id: string;
  empleado_id: string;
  fecha: string;
  motivo: string;
  tipo: string;
  estado: Estado;
  aprobado_por: string | null;
  created_at: string;
};

type SolicitudRetiro = {
  _tipo: "retiro";
  id: string;
  empleado_id: string;
  fecha: string;
  hora_retiro: string;
  motivo: string;
  estado: Estado;
  aprobado_por: string | null;
  created_at: string;
};

type Solicitud = SolicitudVacaciones | SolicitudAusencia | SolicitudRetiro;
type Empleado = { id: string; nombre: string; area_id: string | null };
type Area = { id: string; nombre: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const TIPO_CONFIG = {
  vacaciones: {
    label: "Vacaciones",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  ausencia: {
    label: "Ausencia",
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dot: "bg-yellow-400",
  },
  retiro: {
    label: "Retiro anticipado",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dot: "bg-purple-400",
  },
};

const ESTADO_CONFIG: Record<Estado, { label: string; color: string }> = {
  pendiente: {
    label: "Pendiente",
    color: "bg-border/10 text-secondary border-white/10",
  },
  aprobada: {
    label: "Aprobada",
    color: "bg-accent/10 text-accent border-accent/20",
  },
  rechazada: {
    label: "Rechazada",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

function SolicitudDetails({ s }: { s: Solicitud }) {
  if (s._tipo === "vacaciones") {
    return (
      <div className="flex flex-wrap gap-3 text-xs text-secondary">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {fmtDate(s.fecha_desde)} → {fmtDate(s.fecha_hasta)}
        </span>
        <span className="flex items-center gap-1">
          <FileText size={11} />
          {s.dias} día{s.dias !== 1 ? "s" : ""}
        </span>
        {s.comentario && (
          <span className="text-secondary/60 italic">"{s.comentario}"</span>
        )}
      </div>
    );
  }
  if (s._tipo === "ausencia") {
    return (
      <div className="flex flex-wrap gap-3 text-xs text-secondary">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {fmtDate(s.fecha)}
        </span>
        <span className="capitalize text-secondary/60">{s.tipo}</span>
        <span className="text-secondary/60 italic">"{s.motivo}"</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3 text-xs text-secondary">
      <span className="flex items-center gap-1">
        <Calendar size={11} />
        {fmtDate(s.fecha)}
      </span>
      <span className="flex items-center gap-1">
        <Clock size={11} />
        {s.hora_retiro.slice(0, 5)}
      </span>
      <span className="text-secondary/60 italic">"{s.motivo}"</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SolicitudesPage() {
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  // Filters
  const [filterTipo, setFilterTipo] = useState<
    "all" | "vacaciones" | "ausencia" | "retiro"
  >("all");
  const [filterEstado, setFilterEstado] = useState<"all" | Estado>("all");
  const [filterArea, setFilterArea] = useState<string>("all");

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    tipo: string;
  } | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");

  // Action loading
  const [actionId, setActionId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const empMap: Record<string, string> = {};
      empleados.forEach((e) => { empMap[e.id] = e.nombre; });

      const toRow = (s: Solicitud) => ({
        Tipo:      s._tipo,
        Empleado:  empMap[s.empleado_id] ?? s.empleado_id,
        Estado:    s.estado,
        Fecha:     new Date(s.created_at).toLocaleDateString("es-AR"),
        Detalles:  s._tipo === "vacaciones"
          ? `${(s as {fecha_desde:string}).fecha_desde} → ${(s as {fecha_hasta:string}).fecha_hasta} (${(s as {dias:number}).dias} días)`
          : s._tipo === "ausencia"
          ? (s as {fecha:string;motivo:string}).fecha + " – " + (s as {fecha:string;motivo:string}).motivo
          : (s as {fecha:string;hora_salida:string}).fecha + " " + (s as {fecha:string;hora_salida:string}).hora_salida,
      });

      const wb = utils.book_new();
      utils.book_append_sheet(wb, utils.json_to_sheet(solicitudes.map(toRow)), "Solicitudes");
      utils.book_append_sheet(wb, utils.json_to_sheet(solicitudes.filter((s) => s.estado === "pendiente").map(toRow)), "Pendientes");
      writeFile(wb, `solicitudes_${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase
      .from("empleados")
      .select("id, empresa_id")
      .eq("user_id", user.id)
      .single();
    if (!me) return;
    setMeId(me.id);

    const [{ data: emps }, { data: areasData }] = await Promise.all([
      supabase
        .from("empleados")
        .select("id, nombre, area_id")
        .eq("empresa_id", me.empresa_id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("areas")
        .select("id, nombre")
        .eq("empresa_id", me.empresa_id)
        .order("nombre"),
    ]);

    setEmpleados(emps ?? []);
    setAreas(areasData ?? []);

    const empIds = (emps ?? []).map((e) => e.id);
    if (empIds.length === 0) {
      setSolicitudes([]);
      setLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const [{ data: vacaciones }, { data: ausencias }, { data: retiros }] =
      await Promise.all([
        db
          .from("solicitudes_vacaciones")
          .select(
            "id, empleado_id, fecha_desde, fecha_hasta, dias, comentario, estado, aprobado_por, created_at"
          )
          .in("empleado_id", empIds)
          .order("created_at", { ascending: false }),
        db
          .from("solicitudes_ausencia")
          .select(
            "id, empleado_id, fecha, motivo, tipo, estado, aprobado_por, created_at"
          )
          .in("empleado_id", empIds)
          .order("created_at", { ascending: false }),
        db
          .from("solicitudes_retiro")
          .select(
            "id, empleado_id, fecha, hora_retiro, motivo, estado, aprobado_por, created_at"
          )
          .in("empleado_id", empIds)
          .order("created_at", { ascending: false }),
      ]);

    const all: Solicitud[] = [
      ...((vacaciones ?? []) as Omit<SolicitudVacaciones, "_tipo">[]).map(
        (s) => ({ ...s, _tipo: "vacaciones" as const })
      ),
      ...((ausencias ?? []) as Omit<SolicitudAusencia, "_tipo">[]).map((s) => ({
        ...s,
        _tipo: "ausencia" as const,
      })),
      ...((retiros ?? []) as Omit<SolicitudRetiro, "_tipo">[]).map((s) => ({
        ...s,
        _tipo: "retiro" as const,
      })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setSolicitudes(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const empMap = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, e])),
    [empleados]
  );
  const areaMap = useMemo(
    () => Object.fromEntries(areas.map((a) => [a.id, a.nombre])),
    [areas]
  );

  const filtered = useMemo(() => {
    return solicitudes.filter((s) => {
      if (filterTipo !== "all" && s._tipo !== filterTipo) return false;
      if (filterEstado !== "all" && s.estado !== filterEstado) return false;
      if (filterArea !== "all") {
        const emp = empMap[s.empleado_id];
        if (!emp || emp.area_id !== filterArea) return false;
      }
      return true;
    });
  }, [solicitudes, filterTipo, filterEstado, filterArea, empMap]);

  const pendingCount = solicitudes.filter(
    (s) => s.estado === "pendiente"
  ).length;

  async function handleApprove(s: Solicitud) {
    if (!meId) return;
    setActionId(s.id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const table =
      s._tipo === "vacaciones"
        ? "solicitudes_vacaciones"
        : s._tipo === "ausencia"
        ? "solicitudes_ausencia"
        : "solicitudes_retiro";
    await db
      .from(table)
      .update({ estado: "aprobada", aprobado_por: meId })
      .eq("id", s.id);
    setSolicitudes((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, estado: "aprobada" } : x))
    );
    setActionId(null);
  }

  async function handleReject() {
    if (!rejectModal || !meId) return;
    setActionId(rejectModal.id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const table =
      rejectModal.tipo === "vacaciones"
        ? "solicitudes_vacaciones"
        : rejectModal.tipo === "ausencia"
        ? "solicitudes_ausencia"
        : "solicitudes_retiro";
    await db
      .from(table)
      .update({ estado: "rechazada", aprobado_por: meId })
      .eq("id", rejectModal.id);
    setSolicitudes((prev) =>
      prev.map((x) =>
        x.id === rejectModal.id ? { ...x, estado: "rechazada" } : x
      )
    );
    setRejectModal(null);
    setRejectMotivo("");
    setActionId(null);
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Solicitudes</h1>
          <p className="text-secondary text-sm">
            {solicitudes.length} total · {pendingCount} pendiente
            {pendingCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || solicitudes.length === 0}
          className="flex items-center gap-2 border border-border text-secondary hover:text-foreground hover:border-accent text-sm px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Exportar
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(
            [
              ["vacaciones", "Vacaciones"],
              ["ausencia", "Ausencias"],
              ["retiro", "Retiros"],
            ] as const
          ).map(([tipo, label]) => {
            const cfg = TIPO_CONFIG[tipo];
            const count = solicitudes.filter((s) => s._tipo === tipo).length;
            const pending = solicitudes.filter(
              (s) => s._tipo === tipo && s.estado === "pendiente"
            ).length;
            return (
              <button
                key={tipo}
                onClick={() =>
                  setFilterTipo((prev) => (prev === tipo ? "all" : tipo))
                }
                className={`bg-surface border rounded-xl px-4 py-3 text-left transition-colors hover:border-white/10 ${
                  filterTipo === tipo
                    ? "border-accent/30"
                    : "border-border"
                }`}
              >
                <p className="text-xs text-secondary mb-1">{label}</p>
                <p className="text-xl font-bold">{count}</p>
                {pending > 0 && (
                  <p className={`text-[10px] mt-0.5 ${cfg.color.split(" ")[1]}`}>
                    {pending} pendiente{pending !== 1 ? "s" : ""}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter size={13} className="text-secondary flex-shrink-0" />

        {/* Estado */}
        {(
          ["all", "pendiente", "aprobada", "rechazada"] as const
        ).map((e) => (
          <button
            key={e}
            onClick={() => setFilterEstado(e)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterEstado === e
                ? "bg-accent/15 text-accent font-medium"
                : "text-secondary hover:text-white hover:bg-border/20"
            }`}
          >
            {e === "all"
              ? "Todos los estados"
              : ESTADO_CONFIG[e as Estado].label}
          </button>
        ))}

        {/* Area */}
        <div className="relative ml-auto">
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="appearance-none bg-base border border-border text-xs rounded-lg pl-3 pr-7 py-1.5 text-secondary focus:outline-none focus:border-accent/40"
          >
            <option value="all">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-surface rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-10 text-center">
          <ClipboardList
            size={32}
            className="text-secondary/30 mx-auto mb-3"
          />
          <p className="text-sm text-secondary">
            No hay solicitudes con estos filtros.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const emp = empMap[s.empleado_id];
            const areaNombre = emp?.area_id
              ? (areaMap[emp.area_id] ?? "—")
              : "Sin área";
            const tipoCfg = TIPO_CONFIG[s._tipo];
            const estadoCfg = ESTADO_CONFIG[s.estado];
            const isActioning = actionId === s.id;

            return (
              <div
                key={`${s._tipo}-${s.id}`}
                className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Type dot */}
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${tipoCfg.dot}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium">
                        {emp?.nombre ?? "—"}
                      </span>
                      <span className="text-xs text-secondary/60">
                        {areaNombre}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${tipoCfg.color}`}
                      >
                        {tipoCfg.label}
                      </span>
                      <span
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-medium ${estadoCfg.color}`}
                      >
                        {estadoCfg.label}
                      </span>
                    </div>
                    <SolicitudDetails s={s} />
                  </div>

                  {/* Actions */}
                  {s.estado === "pendiente" && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(s)}
                        disabled={isActioning}
                        title="Aprobar"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-40"
                      >
                        {isActioning ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Aprobar
                      </button>
                      <button
                        onClick={() =>
                          setRejectModal({ id: s.id, tipo: s._tipo })
                        }
                        disabled={isActioning}
                        title="Rechazar"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-40"
                      >
                        <X size={12} />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRejectModal(null);
              setRejectMotivo("");
            }
          }}
        >
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Rechazar solicitud</h2>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectMotivo("");
                }}
                className="p-1 text-secondary hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-secondary mb-4">
              Ingresá el motivo del rechazo para notificar al empleado.
            </p>
            <textarea
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo del rechazo…"
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-red-400/50 placeholder:text-secondary/40 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectMotivo("");
                }}
                className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={actionId !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
              >
                {actionId !== null ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <X size={14} />
                )}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
