import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getLiderScope } from "@/lib/lider-scope";
import MisVacacionesTabs from "./MisVacacionesTabs";
import type { VacacionesRow } from "./MisVacacionesClient";
import type { SolicitudVacacion } from "@/components/MapaVacaciones";
import type { VacacionFila } from "@/lib/export-vacaciones";

export default async function MisVacacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getLiderScope(user.id);
  if (!scope) redirect("/login");

  const admin = createAdminClient();

  // Mis solicitudes
  const { data: raw } = await admin
    .from("solicitudes_vacaciones")
    .select("id, fecha_desde, fecha_hasta, dias, comentario, estado, created_at, aprobado_por, motivo_rechazo")
    .eq("empleado_id", scope.id)
    .order("created_at", { ascending: false });

  const aprobadorIds = [...new Set((raw ?? []).map((r) => r.aprobado_por).filter(Boolean))];
  const aprobadorMap: Record<string, string> = {};
  if (aprobadorIds.length > 0) {
    const { data: aprobadores } = await admin
      .from("empleados")
      .select("id, nombre")
      .in("id", aprobadorIds);
    aprobadores?.forEach((a) => { aprobadorMap[a.id] = a.nombre; });
  }

  const propias: VacacionesRow[] = (raw ?? []).map((r) => ({
    id:               r.id,
    fecha_desde:      r.fecha_desde,
    fecha_hasta:      r.fecha_hasta,
    dias:             r.dias ?? null,
    comentario:       r.comentario ?? null,
    estado:           r.estado as VacacionesRow["estado"],
    created_at:       r.created_at,
    aprobador_nombre: r.aprobado_por ? (aprobadorMap[r.aprobado_por] ?? null) : null,
    motivo_rechazo:   r.motivo_rechazo ?? null,
  }));

  // Mapa del equipo
  const scopeFilter: { col: "empresa_id" | "area_id"; val: string } | null = scope.es_demo
    ? { col: "empresa_id", val: scope.empresa_id }
    : scope.area_id
      ? { col: "area_id", val: scope.area_id }
      : null;

  let equipoSolicitudes: SolicitudVacacion[] = [];
  let equipoFilas: VacacionFila[] = [];

  if (scopeFilter) {
    const { data: empleados } = await admin
      .from("empleados")
      .select("id, nombre, rol, area_id, areas!empleados_area_id_fkey(nombre)")
      .eq("activo", true)
      .eq(scopeFilter.col, scopeFilter.val);

    type EmpleadoInfo = {
      id: string;
      nombre: string;
      rol: string;
      area_nombre: string | null;
    };
    const empInfoMap = new Map<string, EmpleadoInfo>();
    for (const e of (empleados ?? [])) {
      const areas = e.areas as { nombre: string } | { nombre: string }[] | null;
      const area_nombre = Array.isArray(areas) ? areas[0]?.nombre ?? null : areas?.nombre ?? null;
      empInfoMap.set(e.id, { id: e.id, nombre: e.nombre, rol: e.rol, area_nombre });
    }

    const ids = Array.from(empInfoMap.keys());
    if (ids.length > 0) {
      const { data: sols } = await admin
        .from("solicitudes_vacaciones")
        .select("id, empleado_id, fecha_desde, fecha_hasta, dias, estado")
        .in("empleado_id", ids)
        .in("estado", ["aprobada", "pendiente"])
        .order("fecha_desde", { ascending: true });

      for (const s of (sols ?? [])) {
        const info = empInfoMap.get(s.empleado_id);
        if (!info) continue;
        equipoSolicitudes.push({
          id: s.id,
          empleado_id: s.empleado_id,
          empleado_nombre: info.nombre,
          fecha_desde: s.fecha_desde,
          fecha_hasta: s.fecha_hasta,
          estado: s.estado as "aprobada" | "pendiente",
        });
        equipoFilas.push({
          empleado_nombre: info.nombre,
          area_nombre: info.area_nombre,
          cargo: info.rol,
          fecha_desde: s.fecha_desde,
          fecha_hasta: s.fecha_hasta,
          dias: s.dias ?? 0,
          estado: s.estado,
        });
      }
    }
  }

  return (
    <MisVacacionesTabs
      propias={propias}
      equipoSolicitudes={equipoSolicitudes}
      equipoFilas={equipoFilas}
    />
  );
}
