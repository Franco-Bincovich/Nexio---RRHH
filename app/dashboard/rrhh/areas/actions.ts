"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { logAuditoria } from "@/lib/auditoria";

async function getRrhhCtx(): Promise<{ empresa_id: string; empleado_id: string } | null> {
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
  return { empresa_id: emp.empresa_id, empleado_id: emp.id };
}

export async function crearArea(data: {
  nombre: string;
  lider_id: string | null;
}): Promise<{ error?: string }> {
  const ctx = await getRrhhCtx();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { data: newArea, error } = await admin
    .from("areas")
    .insert({
      empresa_id: ctx.empresa_id,
      nombre: data.nombre.trim(),
      lider_id: data.lider_id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.empleado_id,
    accion: "crear_area",
    entidad: "areas",
    entidad_id: newArea?.id,
    detalle: { nombre: data.nombre.trim(), lider_id: data.lider_id },
  });

  revalidatePath("/dashboard/rrhh/areas");
  return {};
}

export async function editarArea(
  id: string,
  data: { nombre: string; lider_id: string | null }
): Promise<{ error?: string }> {
  const ctx = await getRrhhCtx();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("areas")
    .update({ nombre: data.nombre.trim(), lider_id: data.lider_id })
    .eq("id", id)
    .eq("empresa_id", ctx.empresa_id);

  if (error) return { error: error.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.empleado_id,
    accion: "editar_area",
    entidad: "areas",
    entidad_id: id,
    detalle: { nombre: data.nombre.trim(), lider_id: data.lider_id },
  });

  revalidatePath("/dashboard/rrhh/areas");
  return {};
}

export async function eliminarArea(id: string): Promise<{ error?: string }> {
  const ctx = await getRrhhCtx();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient();

  const { count } = await admin
    .from("empleados")
    .select("*", { count: "exact", head: true })
    .eq("area_id", id)
    .eq("activo", true);

  if (count && count > 0) {
    return { error: `El área tiene ${count} empleado${count > 1 ? "s" : ""} activo${count > 1 ? "s" : ""}. Reasignalos antes de eliminarla.` };
  }

  const { error } = await admin.from("areas").delete().eq("id", id).eq("empresa_id", ctx.empresa_id);
  if (error) return { error: error.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.empleado_id,
    accion: "eliminar_area",
    entidad: "areas",
    entidad_id: id,
  });

  revalidatePath("/dashboard/rrhh/areas");
  return {};
}
