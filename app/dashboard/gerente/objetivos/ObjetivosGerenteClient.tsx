"use client";

import { useState } from "react";
import { ChevronDown, Target, CheckCircle2, TrendingUp, Clock, AlertCircle } from "lucide-react";

type EstadoObj = "pendiente" | "en_progreso" | "completado" | "cancelado";

type Objetivo = {
  id:           string;
  titulo:       string;
  descripcion:  string | null;
  progreso:     number;
  estado:       EstadoObj;
  vencimiento:  string | null;
  categoria:    string | null;
  empleado_nombre: string;
  area_id:      string | null;
};

type AreaInfo = { id: string; nombre: string };

const ESTADO_CONFIG: Record<EstadoObj, { label: string; color: string; icon: React.ElementType }> = {
  pendiente:   { label: "Pendiente",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  en_progreso: { label: "En progreso", color: "text-blue-400 bg-blue-400/10 border-blue-400/20",       icon: TrendingUp },
  completado:  { label: "Completado",  color: "text-accent bg-accent/10 border-accent/20",              icon: CheckCircle2 },
  cancelado:   { label: "Cancelado",   color: "text-red-400 bg-red-400/10 border-red-400/20",          icon: AlertCircle },
};

function fmtFecha(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  objetivos:  Objetivo[];
  areas:      AreaInfo[];
  areaEmpMap: Record<string, string>; // empleado_id -> area_id
}

export default function ObjetivosGerenteClient({ objetivos, areas, areaEmpMap }: Props) {
  const [filtroArea, setFiltroArea] = useState<string>("todas");
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set(areas.map((a) => a.id)));

  const areaNombreMap: Record<string, string> = {};
  areas.forEach((a) => { areaNombreMap[a.id] = a.nombre; });

  const filtered = filtroArea === "todas"
    ? objetivos
    : objetivos.filter((o) => areaEmpMap[o.id] === filtroArea || o.area_id === filtroArea);

  // Group by area
  const byArea: Record<string, Objetivo[]> = {};
  filtered.forEach((o) => {
    const areaId = o.area_id ?? "sin_area";
    if (!byArea[areaId]) byArea[areaId] = [];
    byArea[areaId].push(o);
  });

  const total       = filtered.length;
  const completados = filtered.filter((o) => o.estado === "completado").length;
  const enProgreso  = filtered.filter((o) => o.estado === "en_progreso").length;
  const pendientes  = filtered.filter((o) => o.estado === "pendiente").length;
  const promProgreso = total > 0 ? Math.round(filtered.reduce((acc, o) => acc + o.progreso, 0) / total) : 0;

  function toggleArea(areaId: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  }

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Target size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-0.5">Progreso promedio</p>
            <p className="text-[28px] font-extrabold leading-none text-accent">{promProgreso}%</p>
            <p className="text-[10px] text-secondary/50 mt-0.5">{total} objetivo{total !== 1 ? "s" : ""} totales</p>
          </div>
        </div>
        <KpiCard label="Completados"  value={completados} color="text-accent" />
        <KpiCard label="En progreso"  value={enProgreso}  color="text-blue-400" />
        <KpiCard label="Pendientes"   value={pendientes}  color="text-yellow-400" />
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-xs text-secondary">Filtrar por área:</label>
        <select
          value={filtroArea}
          onChange={(e) => setFiltroArea(e.target.value)}
          className="bg-surface border border-[#1A2235] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent/50 transition-colors"
        >
          <option value="todas">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>

      {/* Secciones por área */}
      {Object.keys(byArea).length === 0 ? (
        <div className="bg-surface rounded-xl border border-[#1A2235] py-16 text-center">
          <Target size={28} className="text-secondary/25 mx-auto mb-3" />
          <p className="text-sm text-secondary/60">No hay objetivos para mostrar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byArea).map(([areaId, objs]) => {
            const areaNombre = areaId === "sin_area" ? "Sin área" : (areaNombreMap[areaId] ?? "—");
            const open = expandidas.has(areaId);
            const areaCompletados = objs.filter((o) => o.estado === "completado").length;
            const areaPct = objs.length > 0 ? Math.round(areaCompletados / objs.length * 100) : 0;
            return (
              <div key={areaId} className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
                <button
                  onClick={() => toggleArea(areaId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{areaNombre}</span>
                    <span className="text-[10px] text-secondary/50">{objs.length} objetivos</span>
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${areaPct}%` }} />
                      </div>
                      <span className="text-[10px] text-secondary">{areaPct}%</span>
                    </div>
                  </div>
                  <ChevronDown size={15} className={`text-secondary transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`} />
                </button>

                {open && (
                  <div className="border-t border-[#1A2235] divide-y divide-[#1A2235]">
                    {objs.map((o) => {
                      const est = ESTADO_CONFIG[o.estado] ?? ESTADO_CONFIG.pendiente;
      const EstIcon = est.icon;
                      return (
                        <div key={o.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{o.titulo}</p>
                              <p className="text-[11px] text-secondary/60 mt-0.5">{o.empleado_nombre}</p>
                            </div>
                            <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${est.color}`}>
                              <EstIcon size={10} />
                              {est.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-accent" style={{ width: `${o.progreso}%` }} />
                            </div>
                            <span className="text-xs text-secondary w-8 text-right">{o.progreso}%</span>
                            {o.vencimiento && (
                              <span className="text-[10px] text-secondary/50">{fmtFecha(o.vencimiento)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
      <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">{label}</p>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
