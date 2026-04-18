import { Megaphone } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function VacantesPage() {
  return (
    <ProximamenteView
      titulo="Vacantes"
      descripcion="Publicación de vacantes hacia LinkedIn y portales de empleo. Gestión del proceso de selección y portal de postulaciones internas — todo sin salir de la plataforma."
      icon={Megaphone}
      accionesMock={["Publicar vacante", "Ver postulantes", "Kanban de selección"]}
    />
  );
}
