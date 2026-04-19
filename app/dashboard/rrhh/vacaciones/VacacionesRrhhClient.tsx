"use client";

import { useMemo, useState } from "react";
import MapaVacaciones, { type SolicitudVacacion } from "@/components/MapaVacaciones";
import VacacionesExportBar from "@/components/VacacionesExportBar";
import type { VacacionFila } from "@/lib/export-vacaciones";

type Area = { id: string; nombre: string };

type Props = {
  solicitudes: SolicitudVacacion[];
  filas: VacacionFila[];
  areas: Area[];
  empleadosAreaMap: Record<string, string | null>;
  empleadoRolMap: Record<string, string>;
};

const CARGOS: { value: string; label: string }[] = [
  { value: "",        label: "Todos" },
  { value: "empleado", label: "Empleados" },
  { value: "lider",    label: "Líderes" },
  { value: "gerente",  label: "Gerentes" },
];

export default function VacacionesRrhhClient({
  solicitudes, filas, areas, empleadosAreaMap, empleadoRolMap,
}: Props) {
  const [areaSel, setAreaSel] = useState<string>("");
  const [cargoSel, setCargoSel] = useState<string>("");

  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((s) => {
      if (areaSel && empleadosAreaMap[s.empleado_id] !== areaSel) return false;
      if (cargoSel && empleadoRolMap[s.empleado_id] !== cargoSel) return false;
      return true;
    });
  }, [solicitudes, empleadosAreaMap, empleadoRolMap, areaSel, cargoSel]);

  const areaNombreSel = areaSel
    ? areas.find((a) => a.id === areaSel)?.nombre ?? "area"
    : "todas";

  const filasFiltradas = useMemo(() => {
    return filas.filter((f) => {
      if (areaSel) {
        const areaNombre = areas.find((a) => a.id === areaSel)?.nombre;
        if (f.area_nombre !== areaNombre) return false;
      }
      if (cargoSel && f.cargo !== cargoSel) return false;
      return true;
    });
  }, [filas, areas, areaSel, cargoSel]);

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 flex flex-wrap items-center gap-3">
        <label className="text-xs text-secondary/80">Área:</label>
        <select
          value={areaSel}
          onChange={(e) => setAreaSel(e.target.value)}
          className="bg-base border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent/50"
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        <label className="text-xs text-secondary/80 ml-2">Cargo:</label>
        <select
          value={cargoSel}
          onChange={(e) => setCargoSel(e.target.value)}
          className="bg-base border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent/50"
        >
          {CARGOS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <span className="ml-auto text-[11px] text-secondary/70">
          {solicitudesFiltradas.length} solicitud{solicitudesFiltradas.length !== 1 ? "es" : ""}
        </span>
      </div>

      <VacacionesExportBar
        filas={filasFiltradas}
        areaLabel={areaNombreSel}
        incluirRol
        filtrarCargo={false}
        filtrarArea={false}
      />

      <MapaVacaciones solicitudes={solicitudesFiltradas} mesesAMostrar={2} />
    </div>
  );
}
