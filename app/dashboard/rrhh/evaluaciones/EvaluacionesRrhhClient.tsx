"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { Power, Download, Loader2, CheckCircle2, AlertCircle, Star, Clock } from "lucide-react";
import type { CicloConfig, CriterioScores } from "@/lib/evaluaciones";
import { CRITERIOS } from "@/lib/evaluaciones";
import { toggleCicloEvaluaciones } from "./actions";

export type AreaMini = { id: string; nombre: string };

export type EmpleadoResumen = {
  empleado_id: string;
  nombre: string;
  area_id: string | null;
  area_nombre: string | null;
  rol: string;
  completadas: number;
  promedio: number | null; // 1..5
  estado: "completada" | "pendiente";
};

type DetalleRow = {
  empleado_nombre: string;
  area_nombre: string | null;
  rol: string;
  puntuacion: number | null; // 1..10
  criterios: CriterioScores | null;
  texto: string;
  created_at: string;
};

type Props = {
  ciclo: CicloConfig;
  resumen: EmpleadoResumen[];
  areas: AreaMini[];
  detalle: DetalleRow[];
};

const ROL_LABEL: Record<string, string> = {
  empleado: "Empleado",
  lider:    "Líder",
  gerente:  "Gerente",
  rrhh:     "RRHH",
};

export default function EvaluacionesRrhhClient({ ciclo, resumen, areas, detalle }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [areaSel, setAreaSel] = useState<string>("");

  function handleToggle(activar: boolean) {
    setMsg(null);
    startTransition(async () => {
      const res = await toggleCicloEvaluaciones(activar);
      if (res.error) setMsg({ tipo: "error", texto: res.error });
      else setMsg({ tipo: "ok", texto: activar ? "Ciclo activado" : "Ciclo desactivado" });
    });
  }

  const resumenFiltrado = useMemo(() => {
    return resumen.filter((r) => !areaSel || r.area_id === areaSel);
  }, [resumen, areaSel]);

  const totalCompletadas = resumenFiltrado.filter((r) => r.estado === "completada").length;
  const totalPendientes  = resumenFiltrado.length - totalCompletadas;
  const promGeneral = useMemo(() => {
    const xs = resumenFiltrado.filter((r) => r.promedio !== null).map((r) => r.promedio as number);
    return xs.length > 0 ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : "—";
  }, [resumenFiltrado]);

  function exportar() {
    const filtrarArea = (nombreArea: string | null) => !areaSel || areas.find((a) => a.id === areaSel)?.nombre === nombreArea;

    // Hoja 1: Resumen por empleado
    const resumenHeader = ["Empleado", "Cargo", "Área", "Completadas", "Estado", "Promedio (1-5)"];
    const resumenBody = resumenFiltrado.map((r) => [
      r.nombre,
      ROL_LABEL[r.rol] ?? r.rol,
      r.area_nombre ?? "—",
      r.completadas,
      r.estado === "completada" ? "Completada" : "Pendiente",
      r.promedio !== null ? r.promedio : "—",
    ]);

    // Hoja 2: Detalle
    const detalleFiltrado = detalle.filter((d) => filtrarArea(d.area_nombre));
    const detalleHeader = [
      "Empleado", "Cargo", "Área", "Fecha",
      ...CRITERIOS.map((c) => c.label + " (1-5)"),
      "Promedio (1-5)", "Comentario",
    ];
    const detalleBody = detalleFiltrado.map((d) => {
      const cs = d.criterios;
      const vals = CRITERIOS.map((c) => (cs ? cs[c.key] : ""));
      const prom = d.puntuacion !== null ? (d.puntuacion / 2).toFixed(2) : "—";
      return [
        d.empleado_nombre,
        ROL_LABEL[d.rol] ?? d.rol,
        d.area_nombre ?? "—",
        new Date(d.created_at).toLocaleDateString("es-AR"),
        ...vals,
        prom,
        d.texto,
      ];
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([resumenHeader, ...resumenBody]), "Resumen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([detalleHeader, ...detalleBody]), "Detalle");
    const fecha = new Date().toISOString().split("T")[0];
    const areaLabel = areaSel ? (areas.find((a) => a.id === areaSel)?.nombre ?? "area").toLowerCase().replace(/\s+/g, "_") : "todas";
    XLSX.writeFile(wb, `evaluaciones_${areaLabel}_${fecha}.xlsx`);
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Evaluaciones de desempeño</h1>
        <p className="text-secondary text-sm">Control del ciclo y resultados consolidados</p>
      </div>

      {/* Control del ciclo */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Power size={16} className={ciclo.evaluaciones_activas ? "text-accent" : "text-secondary/60"} />
          <div>
            <h2 className="text-sm font-semibold">
              {ciclo.evaluaciones_activas ? "Ciclo de evaluación activo" : "Ciclo de evaluación cerrado"}
            </h2>
            <p className="text-xs text-secondary/70">
              {ciclo.evaluaciones_activas
                ? `Abierto desde ${ciclo.evaluaciones_activas_desde ? new Date(ciclo.evaluaciones_activas_desde).toLocaleDateString("es-AR") : "—"}. Los líderes pueden evaluar a su equipo.`
                : "Al activar, los líderes verán el formulario de evaluación habilitado."}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {msg && (
              <span className={`text-xs ${msg.tipo === "ok" ? "text-accent" : "text-red-400"}`}>{msg.texto}</span>
            )}
            <button
              disabled={pending}
              onClick={() => handleToggle(!ciclo.evaluaciones_activas)}
              className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors disabled:opacity-50 ${
                ciclo.evaluaciones_activas
                  ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20 hover:bg-yellow-400/20"
                  : "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20"
              }`}
            >
              {pending ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
              {ciclo.evaluaciones_activas ? "Desactivar ciclo" : "Activar ciclo"}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Kpi icon={<CheckCircle2 size={14} className="text-accent" />}   label="Completadas" value={totalCompletadas} color="text-accent" />
        <Kpi icon={<Clock size={14} className="text-yellow-400" />}      label="Pendientes"  value={totalPendientes}  color="text-yellow-400" />
        <Kpi icon={<Star size={14} className="text-blue-400" />}         label="Promedio"    value={promGeneral}      color="text-blue-400" />
      </div>

      {/* Controles resultados */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-4 flex flex-wrap items-center gap-3">
        <label className="text-xs text-secondary/80">Área:</label>
        <select
          value={areaSel}
          onChange={(e) => setAreaSel(e.target.value)}
          className="bg-base border border-[#1A2235] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent/50"
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        <button
          onClick={exportar}
          className="ml-auto flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Download size={12} />
          Exportar Excel
        </button>
      </div>

      {/* Tabla resultados */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
          <h2 className="text-sm font-semibold">Resultados</h2>
          <span className="ml-auto text-[10px] text-secondary/60">{resumenFiltrado.length} empleado{resumenFiltrado.length !== 1 ? "s" : ""}</span>
        </div>
        {resumenFiltrado.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-secondary/60">
            Sin datos para los filtros seleccionados.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A2235] text-[10px] uppercase tracking-[0.7px] text-secondary">
                <th className="text-left px-5 py-2.5 font-medium">Empleado</th>
                <th className="text-left px-5 py-2.5 font-medium">Cargo</th>
                <th className="text-left px-5 py-2.5 font-medium">Área</th>
                <th className="text-right px-5 py-2.5 font-medium">Completadas</th>
                <th className="text-left px-5 py-2.5 font-medium">Estado</th>
                <th className="text-right px-5 py-2.5 font-medium">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {resumenFiltrado.map((r) => (
                <tr key={r.empleado_id} className="border-b border-[#1A2235] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-xs font-medium">{r.nombre}</td>
                  <td className="px-5 py-3 text-xs text-secondary capitalize">{ROL_LABEL[r.rol] ?? r.rol}</td>
                  <td className="px-5 py-3 text-xs text-secondary">{r.area_nombre ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-right">{r.completadas}</td>
                  <td className="px-5 py-3">
                    {r.estado === "completada" ? (
                      <span className="text-[10px] font-bold uppercase text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">Completada</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">Pendiente</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-right font-semibold">
                    {r.promedio !== null ? r.promedio.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mensaje si no hay ciclo y no hay datos */}
      {!ciclo.evaluaciones_activas && resumen.every((r) => r.completadas === 0) && (
        <div className="flex items-center gap-2 text-xs text-secondary/70 bg-white/[0.02] border border-[#1A2235] rounded-xl px-4 py-3">
          <AlertCircle size={13} />
          No hay evaluaciones registradas en el período. Activá el ciclo para habilitar las evaluaciones.
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">{label}</p>
      </div>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
