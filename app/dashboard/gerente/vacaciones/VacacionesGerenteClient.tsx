"use client";

import { useMemo, useState } from "react";
import { Crown, Building2 } from "lucide-react";
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

export default function VacacionesGerenteClient({
  solicitudes, filas, areas, empleadosAreaMap, empleadoRolMap,
}: Props) {
  const [tab, setTab] = useState<"lideres" | "area">("lideres");
  const [areaSel, setAreaSel] = useState<string>(areas[0]?.id ?? "");

  const solicitudesLideres = useMemo(
    () => solicitudes.filter((s) => empleadoRolMap[s.empleado_id] === "lider"),
    [solicitudes, empleadoRolMap],
  );
  const filasLideres = useMemo(
    () => filas.filter((f) => f.cargo === "lider"),
    [filas],
  );

  const solicitudesArea = useMemo(
    () => solicitudes.filter((s) => empleadosAreaMap[s.empleado_id] === areaSel),
    [solicitudes, empleadosAreaMap, areaSel],
  );
  const areaNombre = areas.find((a) => a.id === areaSel)?.nombre ?? "area";
  const filasArea = useMemo(
    () => filas.filter((f) => f.area_nombre === areaNombre),
    [filas, areaNombre],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-[#1A2235]">
        <TabButton activa={tab === "lideres"} onClick={() => setTab("lideres")} icon={Crown}>
          Mapa de líderes
        </TabButton>
        <TabButton activa={tab === "area"} onClick={() => setTab("area")} icon={Building2}>
          Mapa por área
        </TabButton>
      </div>

      {tab === "lideres" ? (
        <div className="space-y-4">
          <p className="text-xs text-secondary/70">
            {solicitudesLideres.length} solicitud{solicitudesLideres.length !== 1 ? "es" : ""} de líderes de la empresa.
          </p>
          <VacacionesExportBar filas={filasLideres} areaLabel="lideres" filtrarCargo={false} />
          <MapaVacaciones solicitudes={solicitudesLideres} mesesAMostrar={2} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-secondary/80">Área:</label>
            <select
              value={areaSel}
              onChange={(e) => setAreaSel(e.target.value)}
              className="bg-base border border-[#1A2235] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent/50"
            >
              {areas.length === 0 && <option value="">— sin áreas —</option>}
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
            <span className="text-[11px] text-secondary/60">
              {solicitudesArea.length} solicitud{solicitudesArea.length !== 1 ? "es" : ""}
            </span>
          </div>
          <VacacionesExportBar filas={filasArea} areaLabel={areaNombre} />
          <MapaVacaciones solicitudes={solicitudesArea} mesesAMostrar={2} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  activa, onClick, icon: Icon, children,
}: {
  activa: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm px-4 py-2.5 border-b-2 transition-colors ${
        activa
          ? "border-accent text-accent"
          : "border-transparent text-secondary hover:text-foreground"
      }`}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}
