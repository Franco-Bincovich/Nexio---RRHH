"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function enviarMensajeLider(data: {
  mensaje: string;
  foroTipo: "gerencia" | "rrhh" | "area";
  areaId: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();
  if (!lider) return { error: "Líder no encontrado" };

  const texto = data.mensaje.trim();
  if (!texto) return { error: "El mensaje no puede estar vacío." };
  if (texto.length > 2000) return { error: "Máximo 2000 caracteres." };

  const admin = createAdminClient();
  const { error } = await admin.from("foros_mensajes").insert({
    empresa_id: lider.empresa_id,
    area_id: data.foroTipo === "rrhh" ? null : data.areaId,
    autor_id: lider.id,
    mensaje: texto,
    foro_tipo: data.foroTipo,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/lider/foro");
  return { ok: true };
}
