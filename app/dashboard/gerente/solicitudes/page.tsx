import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import SolicitudesGerenteClient, { SolicitudNorm } from "./SolicitudesGerenteClient";

export default async function SolicitudesGerentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!gerente) redirect("/login");

  const admin = createAdminClient();

  // Todos los empleados de la empresa
  const { data: empleados } = await admin
    .from("empleados")
    .select("id, nombre, rol, area_id")
    .eq("empresa_id", gerente.empresa_id)
    .eq("activo", true);

  const { data: areas } = await admin
    .from("areas")
    .select("id, nombre")
    .eq("empresa_id", gerente.empresa_id);

  const areaNombreMap: Record<string, string> = {};
  (areas ?? []).forEach((a) => { areaNombreMap[a.id] = a.nombre; });

  const empMap: Record<string, { nombre: string; rol: string; area_id: string | null }> = {};
  (empleados ?? []).forEach((e) => {
    empMap[e.id] = { nombre: e.nombre, rol: e.rol, area_id: e.area_id };
  });

  const allIds = Object.keys(empMap);
  if (allIds.length === 0) return <SolicitudesGerenteClient solicitudes={[]} />;

  const [{ data: ausencias }, { data: retiros }, { data: vacaciones }] = await Promise.all([
    admin.from("solicitudes_ausencia").select("id, empleado_id, estado, created_at, aprobado_por, motivo_rechazo, fecha, motivo, subtipo").in("empleado_id", allIds).order("created_at", { ascending: false }),
    admin.from("solicitudes_retiro").select("id, empleado_id, estado, created_at, aprobado_por, motivo_rechazo, fecha, hora_retiro, motivo").in("empleado_id", allIds).order("created_at", { ascending: false }),
    admin.from("solicitudes_vacaciones").select("id, empleado_id, estado, created_at, aprobado_por, motivo_rechazo, fecha_desde, fecha_hasta, dias, comentario").in("empleado_id", allIds).order("created_at", { ascending: false }),
  ]);

  const aprobadorIds = new Set<string>();
  [...(ausencias ?? []), ...(retiros ?? []), ...(vacaciones ?? [])].forEach((s) => {
    if (s.aprobado_por) aprobadorIds.add(s.aprobado_por);
  });

  const aprobadorMap: Record<string, string> = {};
  if (aprobadorIds.size > 0) {
    const { data: aprobadores } = await admin.from("empleados").select("id, nombre").in("id", Array.from(aprobadorIds));
    aprobadores?.forEach((a) => { aprobadorMap[a.id] = a.nombre; });
  }

  function norm(s: { empleado_id: string; aprobado_por: string | null }, tipo: SolicitudNorm["tipo"], extra: Partial<SolicitudNorm>): SolicitudNorm {
    const emp = empMap[s.empleado_id] ?? { nombre: "—", rol: "empleado", area_id: null };
    return {
      id: "",
      tipo,
      empleado_id:      s.empleado_id,
      empleado_nombre:  emp.nombre,
      empleado_rol:     emp.rol,
      area_nombre:      emp.area_id ? (areaNombreMap[emp.area_id] ?? null) : null,
      estado:           "pendiente",
      created_at:       "",
      aprobador_nombre: s.aprobado_por ? (aprobadorMap[s.aprobado_por] ?? null) : null,
      motivo_rechazo:   null,
      ...extra,
    };
  }

  const solicitudes: SolicitudNorm[] = [
    ...(ausencias ?? []).map((s) => norm(s, "ausencia", {
      id: s.id, estado: s.estado as SolicitudNorm["estado"], created_at: s.created_at,
      motivo_rechazo: s.motivo_rechazo ?? null, fecha: s.fecha, motivo: s.motivo, subtipo: s.subtipo,
    })),
    ...(retiros ?? []).map((s) => norm(s, "retiro", {
      id: s.id, estado: s.estado as SolicitudNorm["estado"], created_at: s.created_at,
      motivo_rechazo: s.motivo_rechazo ?? null, fecha: s.fecha, hora_retiro: s.hora_retiro, motivo: s.motivo,
    })),
    ...(vacaciones ?? []).map((s) => norm(s, "vacaciones", {
      id: s.id, estado: s.estado as SolicitudNorm["estado"], created_at: s.created_at,
      motivo_rechazo: s.motivo_rechazo ?? null, fecha_desde: s.fecha_desde, fecha_hasta: s.fecha_hasta,
      dias: s.dias, comentario: s.comentario,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return <SolicitudesGerenteClient solicitudes={solicitudes} />;
}
