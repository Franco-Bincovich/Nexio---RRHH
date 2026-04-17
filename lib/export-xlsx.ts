/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number;
  width?: number;
};

export type ExportOptions<T> = {
  /** Nombre completo del archivo (incluir .xlsx). Usar makeFilename() para el patrón estándar. */
  filename: string;
  sheetName?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  /** Filas adicionales al final del Excel (ej. totales/promedios). Cada array es una fila. */
  footerRows?: (string | number)[][];
};

export function exportarExcel<T>(opts: ExportOptions<T>) {
  const header = opts.columns.map((c) => c.header);
  const body: (string | number)[][] = opts.rows.map((r) =>
    opts.columns.map((c) => c.accessor(r)),
  );
  const data: (string | number)[][] = [header, ...body];

  if (opts.footerRows && opts.footerRows.length > 0) {
    data.push([]);
    for (const f of opts.footerRows) data.push(f);
  }

  const ws = XLSX.utils.aoa_to_sheet(data as any);
  (ws as any)["!cols"] = opts.columns.map((c) => ({ wch: c.width ?? 16 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName ?? "Datos");
  XLSX.writeFile(wb, opts.filename);
}

export function sanitizeFilename(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase() || "datos";
}

/** Construye el nombre estándar: {modulo}_{scope}_{fecha}.xlsx */
export function makeFilename(modulo: string, scope: string = "todas"): string {
  const fecha = new Date().toISOString().split("T")[0];
  return `${sanitizeFilename(modulo)}_${sanitizeFilename(scope)}_${fecha}.xlsx`;
}

export function fmtFechaISO(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function fmtHora(hora: string | null | undefined): string {
  if (!hora) return "";
  return hora.slice(0, 5);
}
