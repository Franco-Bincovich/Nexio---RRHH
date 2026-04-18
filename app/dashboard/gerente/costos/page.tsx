import { Wallet } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function GerenteCostosPage() {
  return (
    <ProximamenteView
      titulo="Costos"
      descripcion="Visualización de costo neto y bruto por empleado, área y proyecto. Control total del gasto de capital humano en tiempo real."
      icon={Wallet}
      accionesMock={["Costo por área", "Costo por empleado", "Proyección mensual"]}
    />
  );
}
