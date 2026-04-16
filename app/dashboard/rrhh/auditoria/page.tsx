"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import {
  History,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Users,
  Building2,
  Settings,
  FileText,
  UserCheck,
  UserX,
  Upload,
} from "lucide-react";

type AuditoriaRow = {
  id: string;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  created_at: string;
  empleado?: { nombre: string; email: string } | null;
};

const ACCION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  crear_empleado:             { label: "Empleado creado",          icon: Users,      color: "text-green-400" },
  editar_empleado:            { label: "Empleado editado",         icon: Users,      color: "text-blue-400" },
  desactivar_empleado:        { label: "Empleado desactivado",     icon: UserX,      color: "text-red-400" },
  activar_empleado:           { label: "Empleado activado",        icon: UserCheck,  color: "text-green-400" },
  crear_area:                 { label: "Área creada",              icon: Building2,  color: "text-green-400" },
  editar_area:                { label: "Área editada",             icon: Building2,  color: "text-blue-400" },
  eliminar_area:              { label: "Área eliminada",           icon: Building2,  color: "text-red-400" },
  aprobar_solicitud:          { label: "Solicitud aprobada",       icon: FileText,   color: "text-green-400" },
  rechazar_solicitud:         { label: "Solicitud rechazada",      icon: FileText,   color: "text-red-400" },
  guardar_politicas:          { label: "Políticas actualizadas",   icon: Settings,   color: "text-blue-400" },
  guardar_datos_empresa:      { label: "Datos empresa actualizados",icon: Settings,  color: "text-blue-400" },
  importar_empleados:         { label: "Importación masiva",       icon: Upload,     color: "text-accent" },
  crear_evaluacion:           { label: "Evaluación creada",        icon: FileText,   color: "text-green-400" },
  completar_evaluacion:       { label: "Evaluación completada",    icon: FileText,   color: "text-accent" },
  crear_capacitacion:         { label: "Capacitación creada",      icon: FileText,   color: "text-green-400" },
};

const ACCION_GRUPOS = [
  { label: "Todas", value: "" },
  { label: "Empleados", value: "empleado" },
  { label: "Solicitudes", value: "solicitud" },
  { label: "Configuración", value: "config" },
  { label: "Evaluaciones", value: "evaluacion" },
];

function getAccionInfo(accion: string) {
  return ACCION_LABELS[accion] ?? { label: accion, icon: History, color: "text-secondary" };
}

function formatDetalle(detalle: Record<string, unknown> | null): string {
  if (!detalle) return "";
  const parts: string[] = [];
  if (detalle.nombre) parts.push(String(detalle.nombre));
  if (detalle.email) parts.push(String(detalle.email));
  if (detalle.motivo) parts.push(`Motivo: ${detalle.motivo}`);
  if (detalle.tipo) parts.push(`Tipo: ${detalle.tipo}`);
  if (detalle.cantidad != null) parts.push(`${detalle.cantidad} registros`);
  return parts.join(" · ");
}

export default function AuditoriaPage() {
  const [rows, setRows] = useState<AuditoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accionFilter, setAccionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      let q = db
        .from("auditoria")
        .select("id, accion, entidad, entidad_id, detalle, created_at, empleado:empleado_id(nombre, email)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (accionFilter) {
        const matchActions = Object.keys(ACCION_LABELS).filter((k) => k.includes(accionFilter));
        if (matchActions.length > 0) q = q.in("accion", matchActions);
      }
      if (dateFrom) q = q.gte("created_at", dateFrom + "T00:00:00");
      if (dateTo)   q = q.lte("created_at", dateTo + "T23:59:59");

      const { data } = await q;
      setRows(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [page, accionFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        const emp = r.empleado;
        return (
          r.accion.includes(q) ||
          (emp && (emp.nombre?.toLowerCase().includes(q) || emp.email?.toLowerCase().includes(q))) ||
          (r.detalle && JSON.stringify(r.detalle).toLowerCase().includes(q))
        );
      })
    : rows;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <History size={22} className="text-accent" />
          <h1 className="text-xl font-semibold">Auditoría</h1>
        </div>
        <p className="text-sm text-secondary">Historial de acciones realizadas en la plataforma.</p>
      </div>

      {/* Filtros */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        {/* Búsqueda */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-secondary mb-1.5">Buscar</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, email, acción..."
              className="w-full pl-9 pr-3 py-2 bg-base border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Grupo de acción */}
        <div>
          <label className="block text-xs text-secondary mb-1.5">Categoría</label>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <select
              value={accionFilter}
              onChange={(e) => { setAccionFilter(e.target.value); setPage(0); }}
              className="pl-9 pr-8 py-2 bg-base border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
            >
              {ACCION_GRUPOS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          </div>
        </div>

        {/* Fecha desde */}
        <div>
          <label className="block text-xs text-secondary mb-1.5">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-base border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Fecha hasta */}
        <div>
          <label className="block text-xs text-secondary mb-1.5">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="px-3 py-2 bg-base border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-secondary hover:text-foreground hover:border-accent transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wide">Acción</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wide">Detalle</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wide">Realizado por</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-secondary">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
                    <p className="text-xs">Cargando historial...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-secondary">
                    <History size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No hay registros de auditoría</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const info = getAccionInfo(row.accion);
                  const IconComp = info.icon;
                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-border/10 transition-colors">
                      <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-2 ${info.color}`}>
                          <IconComp size={14} className="flex-shrink-0" />
                          <span className="text-xs font-medium">{info.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary max-w-[300px] truncate">
                        {formatDetalle(row.detalle)}
                      </td>
                      <td className="px-4 py-3">
                        {row.empleado ? (
                          <div>
                            <p className="text-xs font-medium">{row.empleado.nombre}</p>
                            <p className="text-[10px] text-secondary">{row.empleado.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-secondary/50">Sistema</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loading && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-secondary">{filtered.length} registros</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs border border-border rounded-lg disabled:opacity-40 hover:border-accent transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs text-secondary">Pág. {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={rows.length < PAGE_SIZE}
                className="px-3 py-1 text-xs border border-border rounded-lg disabled:opacity-40 hover:border-accent transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
