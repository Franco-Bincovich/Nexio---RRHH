"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportarExcel, makeFilename } from "@/lib/export-xlsx";

export type TemperaturaRow = {
  empleado: string;
  area: string;
  semana: string;
  puntuacion: number;
  comentario: string;
};

export default function TemperaturaExportBtn({ rows, empresaLabel = "empresa" }: { rows: TemperaturaRow[]; empresaLabel?: string }) {
  const [pending, startTransition] = useTransition();

  function exportar() {
    startTransition(() => {
      const promedio =
        rows.length > 0
          ? (rows.reduce((a, r) => a + r.puntuacion, 0) / rows.length).toFixed(2)
          : "—";
      exportarExcel<TemperaturaRow>({
        filename: makeFilename("temperatura", empresaLabel),
        sheetName: "Temperatura",
        columns: [
          { header: "Empleado",   accessor: (r) => r.empleado,      width: 28 },
          { header: "Área",       accessor: (r) => r.area,          width: 20 },
          { header: "Semana",     accessor: (r) => r.semana,        width: 12 },
          { header: "Puntuación", accessor: (r) => r.puntuacion,    width: 12 },
          { header: "Comentario", accessor: (r) => r.comentario,    width: 40 },
        ],
        rows,
        footerRows: [
          ["", "", "Total respuestas:", rows.length, ""],
          ["", "", "Promedio general:", promedio, ""],
        ],
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
