"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { exportarExcel, makeFilename } from "@/lib/export-xlsx";
import {
  CalendarClock,
  ArrowDownCircle,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

type Empleado = {
  id: string;
  nombre: string;
  area_id: string | null;
  modalidad: string;
};

type Registro = {
  id: string;
  empleado_id: string;
  tipo: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  metodo: string;
};

type Area = { id: string; nombre: string };

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isToday(d: Date): boolean {
  const today = new Date();
  return toDateStr(d) === toDateStr(today);
}

export default function AsistenciaPage() {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [exporting, setExporting] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (wStart: Date) => {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me } = await supabase
        .from("empleados")
        .select("empresa_id")
        .eq("user_id", user.id)
        .single();
      if (!me) return;

      setEmpresaId(me.empresa_id);

      const [{ data: emps }, { data: areasData }] = await Promise.all([
        supabase
          .from("empleados")
          .select("id, nombre, area_id, modalidad")
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
        setRegistros([]);
        setLoading(false);
        return;
      }

      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 4); // Friday

      const { data: regs } = await supabase
        .from("registros_asistencia")
        .select("id, empleado_id, tipo, fecha, hora_entrada, hora_salida, metodo")
        .in("empleado_id", empIds)
        .gte("fecha", toDateStr(wStart))
        .lte("fecha", toDateStr(wEnd))
        .order("fecha", { ascending: false });

      setRegistros(regs ?? []);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    fetchData(weekStart);
  }, [weekStart, fetchData]);

  const weekDates: Date[] = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const resumenSemana = weekDates.map((date) => {
    const ds = toDateStr(date);
    const dayRegs = registros.filter((r) => r.fecha === ds);
    const presentes = new Set(dayRegs.map((r) => r.empleado_id)).size;
    const home = new Set(
      dayRegs.filter((r) => r.metodo === "home").map((r) => r.empleado_id)
    ).size;
    const total = empleados.length;
    const ausentes = Math.max(0, total - presentes);
    return {
      dia: capitalizeFirst(
        date.toLocaleDateString("es-AR", { weekday: "long" })
      ),
      fecha: `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`,
      presentes,
      home,
      ausentes,
      hoy: isToday(date),
    };
  });

  const areaMap = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));

  // Employees with no records this week
  const empIdsConRegistro = new Set(registros.map((r) => r.empleado_id));
  const anomalias = empleados.filter((e) => !empIdsConRegistro.has(e.id));

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(getMondayOfWeek(d));
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(getMondayOfWeek(d));
  };

  const isCurrentWeek =
    toDateStr(weekStart) === toDateStr(getMondayOfWeek(new Date()));

  async function handleExport() {
    if (!empresaId) return;
    setExporting(true);
    try {
      const empNombreMap = Object.fromEntries(empleados.map((e) => [e.id, e.nombre]));
      const empAreaMap = Object.fromEntries(empleados.map((e) => [e.id, e.area_id]));
      const areaNombreMap = Object.fromEntries(areas.map((a) => [a.id, a.nombre]));

      function calcHoras(entrada: string | null, salida: string | null): string {
        if (!entrada || !salida) return "";
        const [h1, m1] = entrada.split(":").map(Number);
        const [h2, m2] = salida.split(":").map(Number);
        const min = (h2 * 60 + (m2 ?? 0)) - (h1 * 60 + (m1 ?? 0));
        if (!Number.isFinite(min) || min <= 0) return "";
        const h = Math.floor(min / 60);
        const m = min % 60;
        return m === 0 ? `${h}h` : `${h}h ${m}m`;
      }

      const rows = registros.map((r) => ({
        empleado: empNombreMap[r.empleado_id] ?? r.empleado_id,
        area:     areaNombreMap[empAreaMap[r.empleado_id] ?? ""] ?? "—",
        fecha:    r.fecha,
        entrada:  r.hora_entrada ?? "",
        salida:   r.hora_salida ?? "",
        metodo:   r.metodo,
        horas:    calcHoras(r.hora_entrada, r.hora_salida),
      }));

      exportarExcel({
        filename: makeFilename("asistencia", `${toDateStr(weekStart)}_${toDateStr(weekDates[4])}`),
        sheetName: "Asistencia",
        columns: [
          { header: "Empleado",     accessor: (r) => r.empleado, width: 28 },
          { header: "Área",         accessor: (r) => r.area,     width: 18 },
          { header: "Fecha",        accessor: (r) => r.fecha,    width: 12 },
          { header: "Hora entrada", accessor: (r) => r.entrada,  width: 12 },
          { header: "Hora salida",  accessor: (r) => r.salida,   width: 12 },
          { header: "Método",       accessor: (r) => r.metodo,   width: 10 },
          { header: "Horas",        accessor: (r) => r.horas,    width: 10 },
        ],
        rows,
        footerRows: [["", "", "", "", "Total registros:", rows.length]],
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Asistencia</h1>
          <p className="text-secondary text-sm">
            Resumen semanal · {empleados.length} empleados activos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Week navigation */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg px-2 py-1.5">
            <button
              onClick={prevWeek}
              className="p-0.5 hover:text-accent transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-secondary px-1 min-w-[100px] text-center">
              {toDateStr(weekStart)} – {toDateStr(weekDates[4])}
            </span>
            <button
              onClick={nextWeek}
              disabled={isCurrentWeek}
              className="p-0.5 hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Semana siguiente"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading || registros.length === 0}
            className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            Exportar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-surface rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Resumen semanal */}
          <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <CalendarClock size={15} className="text-accent" />
              <h2 className="text-sm font-semibold">Semana actual</h2>
              {!isCurrentWeek && (
                <span className="ml-auto text-[10px] text-secondary/60">
                  semana histórica
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                  <th className="text-left px-5 py-2.5 font-medium">Día</th>
                  <th className="text-right px-5 py-2.5 font-medium">
                    Presentes
                  </th>
                  <th className="text-right px-5 py-2.5 font-medium">
                    Home office
                  </th>
                  <th className="text-right px-5 py-2.5 font-medium">
                    Ausentes
                  </th>
                  <th className="text-right px-5 py-2.5 font-medium">
                    % Asistencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumenSemana.map((row, i) => {
                  const total = row.presentes + row.ausentes;
                  const pct =
                    total > 0 ? Math.round((row.presentes / total) * 100) : 0;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border last:border-0 transition-colors ${
                        row.hoy
                          ? "bg-accent/[0.04]"
                          : "hover:bg-border/10"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <span
                          className={`font-medium ${row.hoy ? "text-accent" : ""}`}
                        >
                          {row.dia}
                        </span>
                        <span className="text-xs text-secondary ml-2">
                          {row.fecha}
                        </span>
                        {row.hoy && (
                          <span className="ml-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                            Hoy
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="flex items-center justify-end gap-1 text-accent">
                          <ArrowDownCircle size={12} />
                          {row.presentes}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-blue-400">
                        {row.home}
                      </td>
                      <td className="px-5 py-3 text-right text-red-400">
                        {row.ausentes}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1 bg-border/20 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              pct >= 80 ? "text-accent" : "text-yellow-400"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Alertas */}
          <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-yellow-400" />
              <h2 className="text-sm font-semibold">
                Sin registros esta semana
              </h2>
              <span className="ml-1 text-[10px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded font-medium">
                {anomalias.length}
              </span>
            </div>
            {anomalias.length === 0 ? (
              <p className="text-sm text-secondary/60 text-center py-4">
                Todos los empleados tienen registros esta semana.
              </p>
            ) : (
              <div className="space-y-0">
                {anomalias.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.nombre}</p>
                      <p className="text-xs text-secondary">
                        {a.area_id ? (areaMap[a.area_id] ?? "—") : "Sin área"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-400">
                        Sin registros esta semana
                      </p>
                      <p className="text-xs text-secondary/60 capitalize">
                        {a.modalidad}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
