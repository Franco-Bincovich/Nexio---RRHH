"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import {
  CalendarDays, TrendingDown, Star, UserMinus, BarChart3,
  Clock, FileText, Users, Download, Loader2, ChevronLeft,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportKey =
  | "asistencia"
  | "ausentismo"
  | "horas"
  | "headcount"
  | "nomina"
  | "objetivos"
  | "rotacion"
  | "evaluaciones";

interface ReportMeta {
  key:         ReportKey;
  titulo:      string;
  descripcion: string;
  icon:        React.ElementType;
  color:       string;
  bg:          string;
  categoria:   string;
}

interface Props {
  empresaId: string;
  areas: { id: string; nombre: string }[];
}

// ── Report definitions ────────────────────────────────────────────────────────

const REPORTES: ReportMeta[] = [
  {
    key:         "asistencia",
    titulo:      "Asistencia mensual",
    descripcion: "Registros de entrada/salida por empleado y área, filtrable por mes.",
    icon:        CalendarDays,
    color:       "text-accent",
    bg:          "bg-accent/10",
    categoria:   "Asistencia",
  },
  {
    key:         "rotacion",
    titulo:      "Rotación de personal",
    descripcion: "Altas y bajas de empleados (activos vs inactivos) en un período.",
    icon:        TrendingDown,
    color:       "text-red-400",
    bg:          "bg-red-400/10",
    categoria:   "RRHH",
  },
  {
    key:         "evaluaciones",
    titulo:      "Evaluación de desempeño",
    descripcion: "Resultados de evaluaciones por empleado, área y período.",
    icon:        Star,
    color:       "text-yellow-400",
    bg:          "bg-yellow-400/10",
    categoria:   "Performance",
  },
  {
    key:         "ausentismo",
    titulo:      "Ausentismo",
    descripcion: "Solicitudes de ausencia aprobadas por empleado y área.",
    icon:        UserMinus,
    color:       "text-orange-400",
    bg:          "bg-orange-400/10",
    categoria:   "Asistencia",
  },
  {
    key:         "objetivos",
    titulo:      "Progreso de objetivos",
    descripcion: "Estado y porcentaje de cumplimiento de objetivos por área.",
    icon:        BarChart3,
    color:       "text-blue-400",
    bg:          "bg-blue-400/10",
    categoria:   "Objetivos",
  },
  {
    key:         "horas",
    titulo:      "Horas trabajadas",
    descripcion: "Banco de horas por empleado calculado desde registros de asistencia.",
    icon:        Clock,
    color:       "text-purple-400",
    bg:          "bg-purple-400/10",
    categoria:   "Asistencia",
  },
  {
    key:         "headcount",
    titulo:      "Headcount por área",
    descripcion: "Distribución de empleados activos e inactivos por área y modalidad.",
    icon:        Users,
    color:       "text-accent",
    bg:          "bg-accent/10",
    categoria:   "RRHH",
  },
  {
    key:         "nomina",
    titulo:      "Nómina completa",
    descripcion: "Listado de todos los empleados con datos completos. Multi-hoja por área.",
    icon:        FileText,
    color:       "text-secondary",
    bg:          "bg-border/10",
    categoria:   "Administración",
  },
];

const CATEGORIA_COLOR: Record<string, string> = {
  Asistencia:     "bg-accent/10 text-accent",
  RRHH:           "bg-red-400/10 text-red-400",
  Performance:    "bg-yellow-400/10 text-yellow-400",
  Objetivos:      "bg-blue-400/10 text-blue-400",
  Administración: "bg-border/10 text-secondary",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const desde   = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const hasta   = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { desde, hasta };
}

function fmtDate(s: string) {
  if (!s) return "—";
  const parts = s.split("-");
  if (parts.length < 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function hora2min(h: string) {
  const [hh, mm, ss] = h.split(":").map(Number);
  return hh * 60 + (mm ?? 0) + Math.round((ss ?? 0) / 60);
}

function min2hm(min: number) {
  const abs = Math.abs(min);
  const h   = Math.floor(abs / 60);
  const m   = abs % 60;
  const sign = min < 0 ? "−" : "";
  return `${sign}${h}h${m > 0 ? ` ${m}m` : ""}`;
}

// ── Overview (cards grid) ─────────────────────────────────────────────────────

export default function ReportesGerenteClient({ empresaId, areas }: Props) {
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  if (activeReport) {
    const meta = REPORTES.find((r) => r.key === activeReport)!;
    return (
      <ReporteDetail
        meta={meta}
        empresaId={empresaId}
        areas={areas}
        onBack={() => setActiveReport(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Reportes</h1>
        <p className="text-secondary text-sm">{REPORTES.length} reportes disponibles</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {REPORTES.map((rep) => {
          const Icon = rep.icon;
          return (
            <div
              key={rep.key}
              className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${rep.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={rep.color} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{rep.titulo}</h3>
                  <p className="text-xs text-secondary mt-0.5 leading-relaxed">{rep.descripcion}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    CATEGORIA_COLOR[rep.categoria] ?? "bg-border/10 text-secondary"
                  }`}
                >
                  {rep.categoria}
                </span>
                <button
                  onClick={() => setActiveReport(rep.key)}
                  className="text-xs py-1 px-3 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors font-medium"
                >
                  Generar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

function ReporteDetail({
  meta,
  empresaId,
  areas,
  onBack,
}: {
  meta:      ReportMeta;
  empresaId: string;
  areas:     { id: string; nombre: string }[];
  onBack:    () => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [mes,           setMes]           = useState(currentMonthStr());
  const [areaId,        setAreaId]        = useState("");
  const [fechaDesde,    setFechaDesde]    = useState(yearStart);
  const [fechaHasta,    setFechaHasta]    = useState(todayStr);
  const [activoFilter,  setActivoFilter]  = useState<"todos" | "activos" | "inactivos">("todos");
  const [tipoEval,      setTipoEval]      = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows,      setRows]      = useState<any[]>([]);
  const [loaded,    setLoaded]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState("");

  const Icon = meta.icon;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setRows([]);
    setLoaded(false);

    const areaMap = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // Step 1: always fetch empresa employees for joins
      // Using db (any) to access extra fields not in TS schema (dni, telefono, fecha_ingreso)
      const { data: todosEmps } = await db
        .from("empleados")
        .select("id, nombre, area_id, rol, modalidad, activo, email, created_at, horas_laborables, fecha_ingreso, dni, telefono")
        .eq("empresa_id", empresaId)
        .order("nombre");

      const todosEmpsArr = todosEmps ?? [];
      const empMap: Record<string, typeof todosEmpsArr[0]> = Object.fromEntries(
        todosEmpsArr.map((e) => [e.id, e])
      );

      // Filter by area (client-side)
      const empsEnArea = areaId
        ? todosEmpsArr.filter((e) => e.area_id === areaId)
        : todosEmpsArr;

      const empIdsEnArea = empsEnArea.map((e) => e.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any[] = [];

      // ── Asistencia mensual ───────────────────────────────────────────────────
      if (meta.key === "asistencia") {
        const { desde, hasta } = monthBounds(mes);
        if (empIdsEnArea.length === 0) { setRows([]); setLoaded(true); setLoading(false); return; }

        const { data: registros, error: err } = await db
          .from("registros_asistencia")
          .select("id, empleado_id, fecha, hora_entrada, hora_salida, tipo, metodo")
          .in("empleado_id", empIdsEnArea)
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha",         { ascending: true })
          .order("hora_entrada",  { ascending: true });

        if (err) throw err;
        data = (registros ?? []).map((r) => {
          const emp = empMap[r.empleado_id];
          return {
            Empleado:   emp?.nombre ?? "—",
            "Área":     emp?.area_id ? (areaMap[emp.area_id] ?? "—") : "—",
            Fecha:      fmtDate(r.fecha),
            Tipo:       r.tipo === "entrada" ? "Entrada" : "Salida",
            "Hora entrada": r.hora_entrada?.slice(0, 5) ?? "—",
            "Hora salida":  r.hora_salida?.slice(0, 5)  ?? "—",
            Método:     r.metodo === "home" ? "Home Office" : "Presencial",
          };
        });

      // ── Ausentismo ───────────────────────────────────────────────────────────
      } else if (meta.key === "ausentismo") {
        const { desde, hasta } = monthBounds(mes);
        if (empIdsEnArea.length === 0) { setRows([]); setLoaded(true); setLoading(false); return; }

        const { data: ausencias, error: err } = await db
          .from("solicitudes_ausencia")
          .select("id, empleado_id, fecha, subtipo, motivo, estado, created_at")
          .in("empleado_id", empIdsEnArea)
          .eq("estado", "aprobada")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha", { ascending: true });

        if (err) throw err;
        data = (ausencias ?? []).map((r) => {
          const emp = empMap[r.empleado_id];
          return {
            Empleado:       emp?.nombre ?? "—",
            "Área":         emp?.area_id ? (areaMap[emp.area_id] ?? "—") : "—",
            Fecha:          fmtDate(r.fecha),
            "Tipo ausencia": r.subtipo ?? "—",
            Motivo:         r.motivo ?? "—",
            Estado:         r.estado,
          };
        });

      // ── Horas trabajadas ─────────────────────────────────────────────────────
      } else if (meta.key === "horas") {
        const { desde, hasta } = monthBounds(mes);
        if (empIdsEnArea.length === 0) { setRows([]); setLoaded(true); setLoading(false); return; }

        const { data: registros, error: err } = await db
          .from("registros_asistencia")
          .select("empleado_id, fecha, hora_entrada, hora_salida")
          .in("empleado_id", empIdsEnArea)
          .not("hora_entrada", "is", null)
          .not("hora_salida",  "is", null)
          .gte("fecha", desde)
          .lte("fecha", hasta);

        if (err) throw err;

        // Aggregate per employee
        const byEmp: Record<string, { minutos: number; dias: number }> = {};
        for (const r of registros ?? []) {
          const min = hora2min(r.hora_salida!) - hora2min(r.hora_entrada!);
          if (!byEmp[r.empleado_id]) byEmp[r.empleado_id] = { minutos: 0, dias: 0 };
          byEmp[r.empleado_id].minutos += min;
          byEmp[r.empleado_id].dias    += 1;
        }

        data = empsEnArea.map((emp) => {
          const agg    = byEmp[emp.id];
          const hl     = (emp.horas_laborables ?? 8) * 60;
          const minTot = agg?.minutos ?? 0;
          const dias   = agg?.dias ?? 0;
          return {
            Empleado:           emp.nombre,
            "Área":             emp.area_id ? (areaMap[emp.area_id] ?? "—") : "—",
            "Días registrados": dias,
            "Horas trabajadas": dias > 0 ? min2hm(minTot) : "Sin registros",
            "Promedio diario":  dias > 0 ? min2hm(Math.round(minTot / dias)) : "—",
            "Vs. laborable":    dias > 0 ? min2hm(minTot - hl * dias) : "—",
          };
        }).sort((a, b) => a.Empleado.localeCompare(b.Empleado));

      // ── Headcount por área ───────────────────────────────────────────────────
      } else if (meta.key === "headcount") {
        const empsParaHC = areaId ? empsEnArea : todosEmpsArr;
        const byArea: Record<string, { activos: number; inactivos: number; presencial: number; remoto: number; hibrido: number }> = {};

        for (const e of empsParaHC) {
          const aName = e.area_id ? (areaMap[e.area_id] ?? "Sin área") : "Sin área";
          if (!byArea[aName]) byArea[aName] = { activos: 0, inactivos: 0, presencial: 0, remoto: 0, hibrido: 0 };
          if (e.activo) byArea[aName].activos++;
          else          byArea[aName].inactivos++;
          if (e.modalidad === "presencial") byArea[aName].presencial++;
          else if (e.modalidad === "remoto") byArea[aName].remoto++;
          else if (e.modalidad === "hibrido") byArea[aName].hibrido++;
        }

        data = Object.entries(byArea)
          .map(([area, v]) => ({
            "Área":       area,
            Activos:      v.activos,
            Inactivos:    v.inactivos,
            Total:        v.activos + v.inactivos,
            Presencial:   v.presencial,
            Remoto:       v.remoto,
            Híbrido:      v.hibrido,
          }))
          .sort((a, b) => b.Total - a.Total);

      // ── Nómina completa ──────────────────────────────────────────────────────
      } else if (meta.key === "nomina") {
        let empsNomina = areaId ? empsEnArea : todosEmpsArr;
        if (activoFilter === "activos")   empsNomina = empsNomina.filter((e) => e.activo);
        if (activoFilter === "inactivos") empsNomina = empsNomina.filter((e) => !e.activo);

        const ROL_LABEL: Record<string, string> = {
          empleado: "Empleado", lider: "Líder", gerente: "Gerente", rrhh: "RRHH",
        };
        const MOD_LABEL: Record<string, string> = {
          presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido",
        };

        data = empsNomina.map((e) => ({
          Nombre:          e.nombre,
          Email:           e.email,
          DNI:             e.dni ?? "—",
          Teléfono:        e.telefono ?? "—",
          "Área":          e.area_id ? (areaMap[e.area_id] ?? "—") : "—",
          Rol:             ROL_LABEL[e.rol] ?? e.rol,
          Modalidad:       MOD_LABEL[e.modalidad] ?? e.modalidad,
          Estado:          e.activo ? "Activo" : "Inactivo",
          "Fecha ingreso": e.fecha_ingreso ? fmtDate(e.fecha_ingreso) : "—",
          "Alta sistema":  fmtDate(e.created_at?.split("T")[0] ?? ""),
        }));

      // ── Progreso de objetivos ────────────────────────────────────────────────
      } else if (meta.key === "objetivos") {
        if (empIdsEnArea.length === 0) { setRows([]); setLoaded(true); setLoading(false); return; }

        const { data: objs, error: err } = await db
          .from("objetivos")
          .select("id, titulo, categoria, progreso, estado, vencimiento, empleado_id")
          .in("empleado_id", empIdsEnArea)
          .order("estado")
          .order("progreso", { ascending: false });

        if (err) throw err;

        const ESTADO_LABEL: Record<string, string> = {
          pendiente: "Pendiente", en_progreso: "En progreso",
          completado: "Completado", cancelado: "Cancelado",
        };

        data = (objs ?? []).map((o: Record<string, unknown>) => {
          const emp = empMap[o.empleado_id as string];
          return {
            Objetivo:    o.titulo,
            Categoría:   (o.categoria as string) ?? "—",
            Empleado:    emp?.nombre ?? "—",
            "Área":      emp?.area_id ? (areaMap[emp.area_id] ?? "—") : "—",
            Estado:      ESTADO_LABEL[(o.estado as string)] ?? (o.estado as string),
            "Progreso %": `${(o.progreso as number) ?? 0}%`,
            Vencimiento: o.vencimiento ? fmtDate(o.vencimiento as string) : "—",
          };
        });

      // ── Rotación de personal ─────────────────────────────────────────────────
      } else if (meta.key === "rotacion") {
        let empsRot = areaId ? empsEnArea : todosEmpsArr;
        empsRot = empsRot.filter((e) => {
          const created = e.created_at?.split("T")[0] ?? "";
          return created >= fechaDesde && created <= fechaHasta;
        });

        const ROL_LABEL: Record<string, string> = {
          empleado: "Empleado", lider: "Líder", gerente: "Gerente", rrhh: "RRHH",
        };

        data = empsRot
          .sort((a, b) => (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1)
          .map((e) => ({
            Nombre:     e.nombre,
            Email:      e.email,
            "Área":     e.area_id ? (areaMap[e.area_id] ?? "—") : "—",
            Rol:        ROL_LABEL[e.rol] ?? e.rol,
            Movimiento: e.activo ? "Alta" : "Baja",
            Estado:     e.activo ? "Activo" : "Inactivo",
            Fecha:      fmtDate(e.created_at?.split("T")[0] ?? ""),
          }));

      // ── Evaluación de desempeño ──────────────────────────────────────────────
      } else if (meta.key === "evaluaciones") {
        const { desde, hasta } = monthBounds(mes);
        if (empIdsEnArea.length === 0) { setRows([]); setLoaded(true); setLoading(false); return; }

        let q = db
          .from("evaluaciones")
          .select("id, empleado_id, evaluador_id, tipo, puntuacion, comentario, fecha, estado")
          .eq("empresa_id", empresaId)
          .in("empleado_id", empIdsEnArea)
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha", { ascending: false });

        if (tipoEval) q = q.eq("tipo", tipoEval);
        const { data: evs, error: err } = await q;
        if (err) throw err;

        const TIPO_LABEL: Record<string, string> = {
          "desempeño": "Desempeño", "360": "360°", semestral: "Semestral",
          anual: "Anual", onboarding: "Onboarding",
        };

        data = (evs ?? []).map((e: Record<string, unknown>) => {
          const emp  = empMap[e.empleado_id as string];
          const eval_ = e.evaluador_id ? empMap[e.evaluador_id as string] : null;
          return {
            Empleado:   emp?.nombre ?? "—",
            "Área":     emp?.area_id ? (areaMap[emp.area_id] ?? "—") : "—",
            Tipo:       TIPO_LABEL[(e.tipo as string)] ?? (e.tipo as string),
            Puntuación: (e.puntuacion as number | null) ?? "—",
            Evaluador:  eval_?.nombre ?? "Sin asignar",
            Fecha:      fmtDate(e.fecha as string),
            Estado:     e.estado === "completada" ? "Completada" : "Pendiente",
            Comentario: (e.comentario as string | null) ?? "—",
          };
        });
      }

      setRows(data);
      setLoaded(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al cargar datos";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [meta.key, empresaId, mes, areaId, fechaDesde, fechaHasta, activoFilter, tipoEval, areas]);

  // ── Export ───────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!rows.length) return;
    setExporting(true);
    try {
      const xlsx = await import("xlsx");
      const wb   = xlsx.utils.book_new();

      if (meta.key === "nomina") {
        // Summary sheet
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), "Todos");
        // One sheet per area
        const byArea: Record<string, typeof rows> = {};
        for (const r of rows) {
          const a = (r["Área"] as string) || "Sin área";
          if (!byArea[a]) byArea[a] = [];
          byArea[a].push(r);
        }
        for (const [aName, aRows] of Object.entries(byArea)) {
          xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(aRows), aName.slice(0, 31));
        }
      } else if (meta.key === "rotacion") {
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), "Todos");
        const altas = rows.filter((r) => r.Movimiento === "Alta");
        const bajas = rows.filter((r) => r.Movimiento === "Baja");
        if (altas.length) xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(altas), "Altas");
        if (bajas.length) xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(bajas), "Bajas");
      } else {
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), meta.titulo.slice(0, 31));
      }

      xlsx.writeFile(wb, `reporte-${meta.key}-${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const showMes      = ["asistencia", "ausentismo", "horas", "evaluaciones"].includes(meta.key);
  const showRango    = meta.key === "rotacion";
  const showActivo   = meta.key === "nomina";
  const showTipoEval = meta.key === "evaluaciones";

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Reportes
        </button>
        <span className="text-secondary/30 text-sm">/</span>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={14} className={meta.color} />
          </div>
          <h1 className="text-lg font-bold">{meta.titulo}</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          {showMes && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.7px] text-secondary mb-1.5">Mes</label>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="bg-base border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
              />
            </div>
          )}

          {showRango && (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.7px] text-secondary mb-1.5">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-base border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.7px] text-secondary mb-1.5">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-base border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-[0.7px] text-secondary mb-1.5">Área</label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="bg-base border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {showActivo && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.7px] text-secondary mb-1.5">Estado</label>
              <select
                value={activoFilter}
                onChange={(e) => setActivoFilter(e.target.value as "todos" | "activos" | "inactivos")}
                className="bg-base border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
              >
                <option value="todos">Todos</option>
                <option value="activos">Solo activos</option>
                <option value="inactivos">Solo inactivos</option>
              </select>
            </div>
          )}

          {showTipoEval && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.7px] text-secondary mb-1.5">Tipo</label>
              <select
                value={tipoEval}
                onChange={(e) => setTipoEval(e.target.value)}
                className="bg-base border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50"
              >
                <option value="">Todos los tipos</option>
                {["desempeño", "360", "semestral", "anual", "onboarding"].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm bg-accent text-[#0A0F1C] font-semibold px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <Icon size={14} />
            }
            Generar reporte
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {/* Preview table */}
      {loaded && (
        <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon size={15} className={meta.color} />
              <h2 className="text-sm font-semibold">{meta.titulo}</h2>
              <span className="text-[10px] text-secondary/50 ml-1">
                {rows.length} registro{rows.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || rows.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {exporting
                ? <Loader2 size={12} className="animate-spin" />
                : <Download size={12} />
              }
              Exportar Excel
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText size={28} className="text-secondary/25 mx-auto mb-3" />
              <p className="text-sm text-secondary/60">
                No se encontraron datos para los filtros seleccionados.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                      {Object.keys(rows[0]).map((col) => (
                        <th key={col} className="text-left px-5 py-2.5 font-medium whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-border/10 transition-colors"
                      >
                        {Object.values(row).map((val, j) => (
                          <td
                            key={j}
                            className="px-5 py-2.5 text-xs text-secondary whitespace-nowrap max-w-[220px]"
                          >
                            <span className="block truncate">{String(val ?? "—")}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 100 && (
                <p className="text-[11px] text-secondary/50 text-center py-3 border-t border-border">
                  Vista previa: primeros 100 de {rows.length} registros. Exportá para ver todos.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
