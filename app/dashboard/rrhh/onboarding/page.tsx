import { UserPlus } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function OnboardingPage() {
  return (
    <ProximamenteView
      titulo="Onboarding"
      descripcion="Alta guiada de nuevos empleados: carga de documentos, foto, configuración inicial y bienvenida automática. El proceso completo desde la contratación hasta el primer día."
      icon={UserPlus}
      accionesMock={["Iniciar alta guiada", "Plantilla de bienvenida", "Checklist de documentos"]}
    />
  );
}
