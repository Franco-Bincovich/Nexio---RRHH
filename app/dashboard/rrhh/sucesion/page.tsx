import { GitBranch } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function RrhhSucesionPage() {
  return (
    <ProximamenteView
      titulo="Planificación de sucesión"
      descripcion="Mapa de talentos críticos de la organización. Identificá quién puede cubrir cada rol clave ante una baja inesperada."
      icon={GitBranch}
      accionesMock={["Editar mapa de talentos", "Definir roles críticos", "Plan de desarrollo"]}
    />
  );
}
