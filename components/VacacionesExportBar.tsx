"use client";

import { useMemo, useState } from "react";
import { Download, Filter } from "lucide-react";
import { exportarVacacionesExcel, type VacacionFila } from "@/lib/export-vacaciones";

type Props = {
  filas: VacacionFila[];
  filtrarCargo?: boolean;
  filtrarArea?: boolean;
  incluirRol?: boolean;
  areaLabel?: string;
};

const CARGOS: { value: string; label: string }[] = [
  { value: "",        label: "Todos los cargos" },
  { value: "empleado", label: "Empleados" },
  { value: "lider",    label: "Líderes" },
  { value: "gerente",  label: "Gerentes" },
  { value: "rrhh",     label: "RRHH" },
];

export default function VacacionesExportBar({
  filas,
  filtrarCargo = true,
  filtrarArea = true,
  incluirRol = false,
  areaLabel = "todas",
}: Props) {
  const [cargo, setCargo] = useState("");
  const [area, setArea] = useState("");

  const areasDisponibles = useMemo(() => {
    const s = new Set<string>();
    for (const f of filas) {
      if (f.area_nombre) s.add(f.area_nombre);
    }
    return Array.from(s).sort();
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    return filas.filter((f) => {
      if (cargo && f.cargo !== cargo) return false;
      if (area && f.area_nombre !== area) return false;
      return true;
    });
  }, [filas, cargo, area]);

  const labelFinal = area || areaLabel;

  return (
    <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-secondary/80 mr-1">
        <Filter size={12} />
        Filtros
      </div>

      {filtrarCargo && (
        <select
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          className="bg-base border border-[#1A2235] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent/50"
        >
          {CARGOS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      )}

      {filtrarArea && areasDisponibles.length > 0 && (
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="bg-base border border-[#1A2235] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent/50"
        >
          <option value="">Todas las áreas</option>
          {areasDisponibles.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      )}

      <div className="ml-auto flex items-center gap-2 text-[11px] text-secondary/70">
        {filasFiltradas.length} de {filas.length}
        <button
          onClick={() => exportarVacacionesExcel(filasFiltradas, { areaLabel: labelFinal, incluirRol })}
          disabled={filasFiltradas.length === 0}
          className="flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 disabled:opacity-40 text-accent border border-accent/20 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Download size={12} />
          Exportar Excel
        </button>
      </div>
    </div>
  );
}
