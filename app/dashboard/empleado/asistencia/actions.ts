"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function registrarSalidaHome(entradaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const hora = new Date().toTimeString().slice(0, 8);

  const { error } = await admin
    .from("registros_asistencia")
    .update({ hora_salida: hora })
    .eq("id", entradaId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/empleado/asistencia");
  return { ok: true };
}
