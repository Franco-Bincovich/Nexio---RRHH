"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

async function getGerente() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: g } = await supabase.from("empleados").select("id").eq("user_id", user.id).single();
  if (!g) throw new Error("No encontrado");
  return { user, g };
}

export async function registrarEntradaHomeGerente(empleadoId: string) {
  try {
    await getGerente();
    const admin = createAdminClient();
    const hoy   = new Date().toISOString().split("T")[0];
    const hora  = new Date().toTimeString().slice(0, 8);
    const { error } = await admin.from("registros_asistencia").insert({ empleado_id: empleadoId, tipo: "entrada", metodo: "home", fecha: hoy, hora_entrada: hora });
    if (error) return { error: error.message };
    revalidatePath("/dashboard/gerente/mi-asistencia");
    return { ok: true };
  } catch (e: unknown) { return { error: e instanceof Error ? e.message : "Error" }; }
}

export async function registrarSalidaHomeGerente(entradaId: string) {
  try {
    await getGerente();
    const admin = createAdminClient();
    const hora  = new Date().toTimeString().slice(0, 8);
    const { error } = await admin.from("registros_asistencia").update({ hora_salida: hora }).eq("id", entradaId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/gerente/mi-asistencia");
    return { ok: true };
  } catch (e: unknown) { return { error: e instanceof Error ? e.message : "Error" }; }
}
