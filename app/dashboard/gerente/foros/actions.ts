"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

async function getGerente() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: g } = await supabase
    .from("empleados")
    .select("id, nombre, empresa_id, rol")
    .eq("user_id", user.id)
    .single();
  if (!g) throw new Error("Gerente no encontrado");
  return g;
}

export async function enviarMensajeGerente(data: {
  mensaje:   string;
  foroTipo:  "gerencia" | "rrhh";
}) {
  try {
    const gerente = await getGerente();
    const admin   = createAdminClient();

    const { error } = await admin.from("foros_mensajes").insert({
      empresa_id: gerente.empresa_id,
      autor_id:   gerente.id,
      mensaje:    data.mensaje,
      area_id:    null,
      foro_tipo:  data.foroTipo,
    });

    if (error) return { error: error.message };
    revalidatePath("/dashboard/gerente/foros");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
