"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

function getLunes(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Dom, 1=Lun ... 6=Sab
  const diff = day === 0 ? -6 : 1 - day;
  const lunes = new Date(now);
  lunes.setDate(now.getDate() + diff);
  return lunes.toISOString().split("T")[0];
}

export async function enviarTemperatura(data: { puntuacion: number; comentario?: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { data: emp } = await supabase
      .from("empleados")
      .select("id, empresa_id")
      .eq("user_id", user.id)
      .single();
    if (!emp) return { error: "Empleado no encontrado" };

    if (data.puntuacion < 1 || data.puntuacion > 10) {
      return { error: "La puntuación debe ser entre 1 y 10" };
    }

    const semana = getLunes();
    const admin = createAdminClient();

    const { error } = await admin.from("respuestas_temperatura").insert({
      empleado_id: emp.id,
      empresa_id: emp.empresa_id,
      puntuacion: data.puntuacion,
      comentario: data.comentario?.trim() || null,
      semana,
    });

    if (error) return { error: error.message };

    revalidatePath("/dashboard/empleado/temperatura");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
