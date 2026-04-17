import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getEmpleadoScope } from "@/lib/lider-scope";
import { AlertCircle } from "lucide-react";
import VacacionesTabs from "./VacacionesTabs";
import type { SolicitudVacacion } from "@/components/MapaVacaciones";

export default async function VacacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getEmpleadoScope(user.id);

  if (!scope) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Vacaciones</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <p className="text-sm">No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  // Solicitudes propias (tab "Mis solicitudes") — mismo patrón que antes
  let empresaEmpleadoIds: string[] | null = null;
  if (scope.es_demo) {
    const { data: empEmpresa } = await supabase
      .from("empleados")
      .select("id")
      .eq("empresa_id", scope.empresa_id);
    empresaEmpleadoIds = (empEmpresa ?? []).map((e) => e.id);
  }

  const solicitudesBase = supabase
    .from("solicitudes_vacaciones")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: solicitudesPropias } = empresaEmpleadoIds !== null
    ? await solicitudesBase.in("empleado_id", empresaEmpleadoIds.length > 0 ? empresaEmpleadoIds : [""])
    : await solicitudesBase.eq("empleado_id", scope.id);

  // Mapa del área (admin bypassa RLS) — aprobadas + pendientes de compañeros del área
  const admin = createAdminClient();
  const scopeFilter: { col: "empresa_id" | "area_id"; val: string } | null = scope.es_demo
    ? { col: "empresa_id", val: scope.empresa_id }
    : scope.area_id
      ? { col: "area_id", val: scope.area_id }
      : null;

  let mapaSolicitudes: SolicitudVacacion[] = [];
  if (scopeFilter) {
    const { data: empleados } = await admin
      .from("empleados")
      .select("id, nombre")
      .eq("activo", true)
      .eq(scopeFilter.col, scopeFilter.val);

    const ids = (empleados ?? []).map((e) => e.id);
    const nombreMap = new Map((empleados ?? []).map((e) => [e.id, e.nombre]));

    if (ids.length > 0) {
      const { data: raw } = await admin
        .from("solicitudes_vacaciones")
        .select("id, empleado_id, fecha_desde, fecha_hasta, estado")
        .in("empleado_id", ids)
        .in("estado", ["aprobada", "pendiente"]);

      mapaSolicitudes = (raw ?? []).map((r) => ({
        id: r.id,
        empleado_id: r.empleado_id,
        empleado_nombre: nombreMap.get(r.empleado_id) ?? "—",
        fecha_desde: r.fecha_desde,
        fecha_hasta: r.fecha_hasta,
        estado: r.estado as "aprobada" | "pendiente",
      }));
    }
  }

  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Vacaciones</h1>
      <p className="text-secondary text-sm mb-6">Solicitá y hacé seguimiento de tus períodos de vacaciones</p>
      <VacacionesTabs
        solicitudesPropias={solicitudesPropias ?? []}
        mapaSolicitudes={mapaSolicitudes}
        empleadoId={scope.id}
        areaNombre={scope.area_nombre}
        hoy={hoy}
      />
    </div>
  );
}
