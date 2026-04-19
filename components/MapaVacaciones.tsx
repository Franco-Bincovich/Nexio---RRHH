"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type SolicitudVacacion = {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  fecha_desde: string;
  fecha_hasta: string;
  estado: "aprobada" | "pendiente";
};

type Props = {
  solicitudes: SolicitudVacacion[];
  modoAnonimo?: boolean;
  empleadoActualId?: string | null;
  mesesAMostrar?: 1 | 2;
};

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthWeeks(year: number, month: number): { date: Date; inMonth: boolean }[][] {
  const first = new Date(year, month, 1);
  const dowMonStart = (first.getDay() + 6) % 7; // Monday=0
  const start = new Date(year, month, 1 - dowMonStart);
  const weeks: { date: Date; inMonth: boolean }[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const wk: { date: Date; inMonth: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      wk.push({ date: new Date(cur), inMonth: cur.getMonth() === month });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(wk);
    if (wk[6].date.getMonth() !== month && wk[0].date.getMonth() !== month) break;
  }
  return weeks;
}

export default function MapaVacaciones({
  solicitudes,
  modoAnonimo = false,
  empleadoActualId = null,
  mesesAMostrar = 2,
}: Props) {
  const hoy = new Date();
  const [mesAncla, setMesAncla] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  // Index: iso → solicitudes que lo cubren
  const diaIndex = useMemo(() => {
    const map = new Map<string, SolicitudVacacion[]>();
    for (const s of solicitudes) {
      const d = new Date(s.fecha_desde + "T00:00:00");
      const end = new Date(s.fecha_hasta + "T00:00:00");
      while (d <= end) {
        const key = isoDay(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [solicitudes]);

  const meses: { year: number; month: number }[] = [];
  for (let i = 0; i < mesesAMostrar; i++) {
    const d = new Date(mesAncla.getFullYear(), mesAncla.getMonth() + i, 1);
    meses.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  function prev() { setMesAncla(new Date(mesAncla.getFullYear(), mesAncla.getMonth() - 1, 1)); }
  function next() { setMesAncla(new Date(mesAncla.getFullYear(), mesAncla.getMonth() + 1, 1)); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={prev}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-white/[0.04] transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={next}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-white/[0.04] transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={14} />
        </button>

        <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-[0.6px] text-secondary">
          <LeyendaPill color="accent" label="Aprobada" />
          <LeyendaPill color="yellow" label="Pendiente" />
          <LeyendaPill color="red" label="Superposición" />
        </div>
      </div>

      <div className={`grid ${mesesAMostrar === 2 ? "lg:grid-cols-2" : "grid-cols-1"} gap-4`}>
        {meses.map((m) => (
          <MesGrid
            key={`${m.year}-${m.month}`}
            year={m.year}
            month={m.month}
            diaIndex={diaIndex}
            modoAnonimo={modoAnonimo}
            empleadoActualId={empleadoActualId}
          />
        ))}
      </div>
    </div>
  );
}

function LeyendaPill({ color, label }: { color: "accent" | "yellow" | "red"; label: string }) {
  const bg =
    color === "accent" ? "bg-accent" :
    color === "yellow" ? "bg-yellow-400" :
    "bg-red-400";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${bg}`} />
      {label}
    </span>
  );
}

function MesGrid({
  year, month, diaIndex, modoAnonimo, empleadoActualId,
}: {
  year: number;
  month: number;
  diaIndex: Map<string, SolicitudVacacion[]>;
  modoAnonimo: boolean;
  empleadoActualId: string | null;
}) {
  const weeks = buildMonthWeeks(year, month);

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{MESES_ES[month]} {year}</h3>
      </div>

      <div className="grid grid-cols-7 text-[10px] uppercase tracking-wide text-secondary/60 border-b border-border">
        {DIAS.map((d, i) => (
          <div key={i} className="px-2 py-1.5 text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[88px]">
        {weeks.flat().map((cell, idx) => {
          const iso = isoDay(cell.date);
          const items = diaIndex.get(iso) ?? [];
          const overlap = items.length >= 2;
          return (
            <div
              key={idx}
              className={`border-r border-b border-border last:border-r-0 p-1 text-[10px] overflow-hidden ${
                !cell.inMonth ? "bg-white/[0.015] text-secondary/30" : ""
              } ${overlap ? "ring-1 ring-inset ring-red-400/80" : ""}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`${cell.inMonth ? "text-secondary/70" : ""}`}>{cell.date.getDate()}</span>
              </div>
              {cell.inMonth && items.length > 0 && (
                <div className="space-y-0.5">
                  {items.slice(0, 2).map((it) => {
                    const isMine = empleadoActualId && it.empleado_id === empleadoActualId;
                    const nombre = modoAnonimo && !isMine ? "Ocupado" : it.empleado_nombre;
                    const bg =
                      it.estado === "aprobada"
                        ? (isMine ? "bg-accent/40 text-accent" : "bg-accent/20 text-accent")
                        : (isMine ? "bg-yellow-400/40 text-yellow-300" : "bg-yellow-400/20 text-yellow-300");
                    return (
                      <div
                        key={it.id}
                        title={`${it.empleado_nombre} · ${it.fecha_desde} → ${it.fecha_hasta} · ${it.estado}`}
                        className={`truncate px-1 py-0.5 rounded ${bg}`}
                      >
                        {nombre}
                      </div>
                    );
                  })}
                  {items.length > 2 && (
                    <div className="text-[9px] text-secondary/60 px-1">+{items.length - 2} más</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
