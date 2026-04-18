import { Wallet } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function RrhhCostosPage() {
  return (
    <ProximamenteView
      titulo="Costos"
      descripcion="Visualización de costo neto y bruto por empleado, área y proyecto. Control total del gasto de capital humano en tiempo real."
      icon={Wallet}
      accionesMock={["Ver costos por empleado", "Editar bandas salariales", "Exportar liquidación"]}
    />
  );
}
