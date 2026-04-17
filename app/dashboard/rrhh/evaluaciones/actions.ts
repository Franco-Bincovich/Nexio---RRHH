"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { logAuditoria } from "@/lib/auditoria";

async function getRrhhCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, empresa_id, rol, es_demo")
    .eq("user_id", user.id)
    .single();
  if (!emp) return null;
  if (!emp.es_demo && emp.rol !== "rrhh") return null;
  return { empleado_id: emp.id, empresa_id: emp.empresa_id };
}

export async function toggleCicloEvaluaciones(activar: boolean): Promise<{ error?: string }> {
  const ctx = await getRrhhCtx();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient() as any;
  const patch: Record<string, unknown> = {
    empresa_id: ctx.empresa_id,
    evaluaciones_activas: activar,
  };
  if (activar) patch.evaluaciones_activas_desde = new Date().toISOString();

  const { error } = await admin
    .from("empresa_config")
    .upsert(patch, { onConflict: "empresa_id" });
  if (error) return { error: error.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.empleado_id,
    accion: activar ? "activar_ciclo_evaluaciones" : "desactivar_ciclo_evaluaciones",
    entidad: "empresa_config",
    entidad_id: ctx.empresa_id,
    detalle: { activar },
  });

  revalidatePath("/dashboard/rrhh/evaluaciones");
  revalidatePath("/dashboard/lider/evaluaciones");
  revalidatePath("/dashboard/empleado/evaluaciones");
  revalidatePath("/dashboard/gerente/evaluaciones");
  return {};
}
