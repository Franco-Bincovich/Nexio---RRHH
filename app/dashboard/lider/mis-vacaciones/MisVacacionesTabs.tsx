"use client";

import { useState } from "react";
import { Calendar, Umbrella } from "lucide-react";
import MisVacacionesClient, { type VacacionesRow } from "./MisVacacionesClient";
import MapaVacaciones, { type SolicitudVacacion } from "@/components/MapaVacaciones";
import VacacionesExportBar from "@/components/VacacionesExportBar";
import type { VacacionFila } from "@/lib/export-vacaciones";

type Props = {
  propias: VacacionesRow[];
  equipoSolicitudes: SolicitudVacacion[];
  equipoFilas: VacacionFila[];
};

export default function MisVacacionesTabs({ propias, equipoSolicitudes, equipoFilas }: Props) {
  const [tab, setTab] = useState<"mias" | "mapa">("mias");

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex gap-1 border-b border-border mb-6">
        <TabButton activa={tab === "mias"} onClick={() => setTab("mias")} icon={Umbrella}>
          Mis vacaciones
        </TabButton>
        <TabButton activa={tab === "mapa"} onClick={() => setTab("mapa")} icon={Calendar}>
          Mapa del equipo
        </TabButton>
      </div>

      {tab === "mias" ? (
        <div className="-m-4 md:-m-8">
          <MisVacacionesClient vacaciones={propias} />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-1">Mapa del equipo</h2>
            <p className="text-xs text-secondary/70">
              Vacaciones aprobadas y pendientes del equipo.
            </p>
          </div>

          <VacacionesExportBar filas={equipoFilas} />

          <MapaVacaciones solicitudes={equipoSolicitudes} mesesAMostrar={2} />
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
