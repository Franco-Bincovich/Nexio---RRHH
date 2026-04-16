import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import SolicitudesLiderClient, { SolicitudNorm } from "./SolicitudesLiderClient";

export default async function SolicitudesLiderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, area_id, empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!lider?.area_id) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Solicitudes del área</h1>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          No tenés un área asignada. Contactá con RRHH o un gerente.
        </div>
      </div>
    );
  }

  const admin = createAdminClient();

  // Empleados del área (sin incluir al líder)
  const { data: equipo } = await admin
    .from("empleados")
    .select("id, nombre")
    .eq("area_id", lider.area_id)
    .eq("activo", true)
    .neq("id", lider.id);

  const empleadoIds = equipo?.map((e) => e.id) ?? [];
  const empleadoNombreMap: Record<string, string> = {};
  equipo?.forEach((e) => { empleadoNombreMap[e.id] = e.nombre; });

  if (empleadoIds.length === 0) {
    return <SolicitudesLiderClient solicitudes={[]} />;
  }

  // Queries en paralelo
  const [{ data: ausencias }, { data: retiros }, { data: vacaciones }] = await Promise.all([
    admin
      .from("solicitudes_ausencia")
      .select("id, empleado_id, estado, created_at, aprobado_por, motivo_rechazo, fecha, motivo, subtipo")
      .in("empleado_id", empleadoIds)
      .order("created_at", { ascending: false }),
    admin
      .from("solicitudes_retiro")
      .select("id, empleado_id, estado, created_at, aprobado_por, motivo_rechazo, fecha, hora_retiro, motivo")
      .in("empleado_id", empleadoIds)
      .order("created_at", { ascending: false }),
    admin
      .from("solicitudes_vacaciones")
      .select("id, empleado_id, estado, created_at, aprobado_por, motivo_rechazo, fecha_desde, fecha_hasta, dias, comentario")
      .in("empleado_id", empleadoIds)
      .order("created_at", { ascending: false }),
  ]);

  // Recolectar IDs de aprobadores para obtener sus nombres
  const aprobadorIds = new Set<string>();
  [...(ausencias ?? []), ...(retiros ?? []), ...(vacaciones ?? [])].forEach((s) => {
    if (s.aprobado_por) aprobadorIds.add(s.aprobado_por);
  });

  const aprobadorNombreMap: Record<string, string> = {};
  if (aprobadorIds.size > 0) {
    const { data: aprobadores } = await admin
      .from("empleados")
      .select("id, nombre")
      .in("id", Array.from(aprobadorIds));
    aprobadores?.forEach((a) => { aprobadorNombreMap[a.id] = a.nombre; });
  }

  // Normalizar
  const solicitudes: SolicitudNorm[] = [
    ...(ausencias ?? []).map((s) => ({
      id:               s.id,
      tipo:             "ausencia" as const,
      empleado_id:      s.empleado_id,
      empleado_nombre:  empleadoNombreMap[s.empleado_id] ?? "—",
      estado:           s.estado as SolicitudNorm["estado"],
      created_at:       s.created_at,
      aprobador_nombre: s.aprobado_por ? (aprobadorNombreMap[s.aprobado_por] ?? null) : null,
      motivo_rechazo:   s.motivo_rechazo ?? null,
      fecha:            s.fecha,
      motivo:           s.motivo,
      subtipo:          s.subtipo,
    })),
    ...(retiros ?? []).map((s) => ({
      id:               s.id,
      tipo:             "retiro" as const,
      empleado_id:      s.empleado_id,
      empleado_nombre:  empleadoNombreMap[s.empleado_id] ?? "—",
      estado:           s.estado as SolicitudNorm["estado"],
      created_at:       s.created_at,
      aprobador_nombre: s.aprobado_por ? (aprobadorNombreMap[s.aprobado_por] ?? null) : null,
      motivo_rechazo:   s.motivo_rechazo ?? null,
      fecha:            s.fecha,
      hora_retiro:      s.hora_retiro,
      motivo:           s.motivo,
    })),
    ...(vacaciones ?? []).map((s) => ({
      id:               s.id,
      tipo:             "vacaciones" as const,
      empleado_id:      s.empleado_id,
      empleado_nombre:  empleadoNombreMap[s.empleado_id] ?? "—",
      estado:           s.estado as SolicitudNorm["estado"],
      created_at:       s.created_at,
      aprobador_nombre: s.aprobado_por ? (aprobadorNombreMap[s.aprobado_por] ?? null) : null,
      motivo_rechazo:   s.motivo_rechazo ?? null,
      fecha_desde:      s.fecha_desde,
      fecha_hasta:      s.fecha_hasta,
      dias:             s.dias,
      comentario:       s.comentario,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return <SolicitudesLiderClient solicitudes={solicitudes} />;
}
