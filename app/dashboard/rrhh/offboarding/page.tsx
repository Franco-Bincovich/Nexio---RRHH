import { UserMinus } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function OffboardingPage() {
  return (
    <ProximamenteView
      titulo="Offboarding"
      descripcion="Flujo de baja estructurado: checklist de cierre, devolución de equipos, revocación automática de accesos y exportación del legajo final."
      icon={UserMinus}
      accionesMock={["Iniciar baja", "Checklist de salida", "Exportar legajo"]}
    />
  );
}
