import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import MisVacacionesGerenteClient, { VacacionesRow } from "./MisVacacionesGerenteClient";

export default async function MisVacacionesGerentePage() {
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

  const { data: raw } = await admin
    .from("solicitudes_vacaciones")
    .select("id, fecha_desde, fecha_hasta, dias, comentario, estado, created_at, aprobado_por, motivo_rechazo")
    .eq("empleado_id", gerente.id)
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

  const vacaciones: VacacionesRow[] = (raw ?? []).map((r) => ({
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

  return <MisVacacionesGerenteClient vacaciones={vacaciones} />;
}
