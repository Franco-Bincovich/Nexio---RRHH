"use client";

import { useState } from "react";
import { Calendar, Umbrella } from "lucide-react";
import VacacionesClient, { type Solicitud } from "./VacacionesClient";
import MapaVacaciones, { type SolicitudVacacion } from "@/components/MapaVacaciones";

type Props = {
  solicitudesPropias: Solicitud[];
  mapaSolicitudes: SolicitudVacacion[];
  empleadoId: string;
  areaNombre: string | null;
  hoy: string;
};

export default function VacacionesTabs({
  solicitudesPropias,
  mapaSolicitudes,
  empleadoId,
  areaNombre,
  hoy,
}: Props) {
  const [tab, setTab] = useState<"mias" | "mapa">("mias");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        <TabButton activa={tab === "mias"} onClick={() => setTab("mias")} icon={Umbrella}>
          Mis solicitudes
        </TabButton>
        <TabButton activa={tab === "mapa"} onClick={() => setTab("mapa")} icon={Calendar}>
          Mapa del área
        </TabButton>
      </div>

      {tab === "mias" ? (
        <VacacionesClient solicitudes={solicitudesPropias} hoy={hoy} />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-secondary/70">
            {areaNombre ? `Área ${areaNombre}` : "Sin área asignada"} · compañeros anónimos, tus solicitudes se muestran con tu nombre.
          </p>
          <MapaVacaciones
            solicitudes={mapaSolicitudes}
            modoAnonimo
            empleadoActualId={empleadoId}
            mesesAMostrar={2}
          />
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
