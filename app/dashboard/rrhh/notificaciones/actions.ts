"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

async function getEmpleadoId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: emp } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!emp) throw new Error("Empleado no encontrado");
  return { supabase, empleadoId: emp.id };
}

export async function marcarTodasLeidas() {
  try {
    const { supabase, empleadoId } = await getEmpleadoId();
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("destinatario_id", empleadoId)
      .eq("leida", false);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/rrhh", "layout");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function marcarLeida(id: string) {
  try {
    const { supabase, empleadoId } = await getEmpleadoId();
    const { error } = await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("id", id)
      .eq("destinatario_id", empleadoId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/rrhh", "layout");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function guardarPreferenciasNotif(prefs: Record<string, boolean>) {
  try {
    const { empleadoId } = await getEmpleadoId();
    const admin = createAdminClient();
    const { error } = await admin
      .from("empleados")
      .update({ notif_preferencias: prefs })
      .eq("id", empleadoId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/rrhh/notificaciones");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
