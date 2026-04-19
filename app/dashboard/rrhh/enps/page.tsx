import { LineChart } from "lucide-react";
import ProximamenteView from "@/components/ProximamenteView";

export default function RrhhEnpsPage() {
  return (
    <ProximamenteView
      titulo="eNPS"
      descripcion="Employee Net Promoter Score: mide qué tan dispuesto está tu equipo a recomendar la empresa como lugar de trabajo. Encuesta anónima, análisis por área y tendencia histórica."
      icon={LineChart}
      accionesMock={["Lanzar encuesta", "Ver resultados por área", "Exportar tendencia"]}
    />
  );
}
