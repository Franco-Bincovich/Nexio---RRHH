"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportarExcel, makeFilename } from "@/lib/export-xlsx";

export type AsistenciaRow = {
  empleado: string;
  area: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  metodo: string;
  horas: string;
};

export default function AsistenciaExportBtn({ rows, scopeLabel = "area" }: { rows: AsistenciaRow[]; scopeLabel?: string }) {
  const [pending, startTransition] = useTransition();

  function exportar() {
    startTransition(() => {
      exportarExcel<AsistenciaRow>({
        filename: makeFilename("asistencia", scopeLabel),
        sheetName: "Asistencia",
        columns: [
          { header: "Empleado",     accessor: (r) => r.empleado,     width: 28 },
          { header: "Área",         accessor: (r) => r.area,         width: 18 },
          { header: "Fecha",        accessor: (r) => r.fecha,        width: 12 },
          { header: "Hora entrada", accessor: (r) => r.hora_entrada, width: 12 },
          { header: "Hora salida",  accessor: (r) => r.hora_salida,  width: 12 },
          { header: "Método",       accessor: (r) => r.metodo,       width: 10 },
          { header: "Horas",        accessor: (r) => r.horas,        width: 10 },
        ],
        rows,
        footerRows: [["", "", "", "", "", "Total registros:", rows.length]],
      });
    });
  }

  return (
    <button
      onClick={exportar}
      disabled={pending || rows.length === 0}
      className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-40"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      Exportar Excel
    </button>
  );
}
