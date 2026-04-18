import { GitBranch } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function GerenteSucesionPage() {
  return (
    <ProximamenteView
      titulo="Planificación de sucesión"
      descripcion="Mapa de talentos críticos de la organización. Identificá quién puede cubrir cada rol clave ante una baja inesperada."
      icon={GitBranch}
      accionesMock={["Ver mapa de talentos", "Matriz de reemplazos", "Riesgo por rol"]}
    />
  );
}
