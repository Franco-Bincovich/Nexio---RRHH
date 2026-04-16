"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function getEmpleado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, empresa_id, area_id")
    .eq("user_id", user.id)
    .single();
  if (!emp) throw new Error("Empleado no encontrado");
  return { supabase, emp };
}

export async function enviarMensaje(data: {
  mensaje: string;
  areaId: string | null; // null = foro RRHH
}) {
  try {
    const { supabase, emp } = await getEmpleado();

    const texto = data.mensaje.trim();
    if (!texto) return { error: "El mensaje no puede estar vacío." };
    if (texto.length > 2000) return { error: "El mensaje es demasiado largo (máx 2000 caracteres)." };

    const { error } = await supabase.from("foros_mensajes").insert({
      empresa_id: emp.empresa_id,
      area_id: data.areaId,
      autor_id: emp.id,
      mensaje: texto,
    });

    if (error) return { error: error.message };
    revalidatePath("/dashboard/empleado/foro");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
