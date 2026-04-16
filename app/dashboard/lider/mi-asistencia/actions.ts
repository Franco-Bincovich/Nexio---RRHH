"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function registrarEntradaHomeLider(empleadoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const hoy  = new Date().toISOString().split("T")[0];
  const hora = new Date().toTimeString().slice(0, 8);

  const { error } = await admin.from("registros_asistencia").insert({
    empleado_id:  empleadoId,
    tipo:         "entrada",
    metodo:       "home",
    fecha:        hoy,
    hora_entrada: hora,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/lider/mi-asistencia");
  return { ok: true };
}

export async function registrarSalidaHomeLider(entradaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const hora  = new Date().toTimeString().slice(0, 8);

  const { error } = await admin
    .from("registros_asistencia")
    .update({ hora_salida: hora })
    .eq("id", entradaId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/lider/mi-asistencia");
  return { ok: true };
}
