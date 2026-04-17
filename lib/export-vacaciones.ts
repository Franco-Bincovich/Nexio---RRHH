/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";

export type VacacionFila = {
  empleado_nombre: string;
  area_nombre: string | null;
  cargo: string; // rol del empleado
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  estado: string;
};

const ROL_LABEL: Record<string, string> = {
  empleado: "Empleado",
  lider:    "Líder",
  gerente:  "Gerente",
  rrhh:     "RRHH",
};

function fmtFecha(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function sanitize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .toLowerCase();
}

export function exportarVacacionesExcel(
  filas: VacacionFila[],
  opts: { areaLabel?: string; incluirRol?: boolean } = {},
) {
  const { areaLabel = "todas", incluirRol = false } = opts;

  const header = incluirRol
    ? ["Empleado", "Rol", "Área", "Cargo", "Fecha desde", "Fecha hasta", "Días", "Estado"]
    : ["Empleado", "Área", "Cargo", "Fecha desde", "Fecha hasta", "Días", "Estado"];

  const body = filas.map((f) => {
    const cargo = ROL_LABEL[f.cargo] ?? f.cargo;
    const area = f.area_nombre ?? "—";
    const estado = f.estado.charAt(0).toUpperCase() + f.estado.slice(1);
    const row: (string | number)[] = incluirRol
      ? [f.empleado_nombre, cargo, area, cargo, fmtFecha(f.fecha_desde), fmtFecha(f.fecha_hasta), f.dias, estado]
      : [f.empleado_nombre, area, cargo, fmtFecha(f.fecha_desde), fmtFecha(f.fecha_hasta), f.dias, estado];
    return row;
  });

  // Totales por área al final
  const totalesPorArea: Record<string, number> = {};
  for (const f of filas) {
    const k = f.area_nombre ?? "Sin área";
    totalesPorArea[k] = (totalesPorArea[k] ?? 0) + (f.dias ?? 0);
  }

  const totalesRows: (string | number)[][] = [];
  if (filas.length > 0) {
    totalesRows.push([]);
    totalesRows.push(["Totales por área"]);
    for (const [area, dias] of Object.entries(totalesPorArea)) {
      totalesRows.push([area, `${dias} días`]);
    }
  }

  const data: (string | number)[][] = [header, ...body, ...totalesRows];

  const ws = XLSX.utils.aoa_to_sheet(data as any);
  const colWidths: { wch: number }[] = header.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  (ws as any)["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vacaciones");

  const fecha = new Date().toISOString().split("T")[0];
  const filename = `vacaciones_${sanitize(areaLabel)}_${fecha}.xlsx`;
  XLSX.writeFile(wb, filename);
}
