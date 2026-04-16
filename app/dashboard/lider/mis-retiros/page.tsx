import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import MisRetirosClient, { RetiroRow } from "./MisRetirosClient";

export default async function MisRetirosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!lider) redirect("/login");

  const admin = createAdminClient();

  const { data: raw } = await admin
    .from("solicitudes_retiro")
    .select("id, fecha, hora_retiro, motivo, estado, created_at, aprobado_por, motivo_rechazo")
    .eq("empleado_id", lider.id)
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

  const retiros: RetiroRow[] = (raw ?? []).map((r) => ({
    id:               r.id,
    fecha:            r.fecha,
    hora_retiro:      r.hora_retiro ?? null,
    motivo:           r.motivo ?? null,
    estado:           r.estado as RetiroRow["estado"],
    created_at:       r.created_at,
    aprobador_nombre: r.aprobado_por ? (aprobadorMap[r.aprobado_por] ?? null) : null,
    motivo_rechazo:   r.motivo_rechazo ?? null,
  }));

  return <MisRetirosClient retiros={retiros} />;
}
