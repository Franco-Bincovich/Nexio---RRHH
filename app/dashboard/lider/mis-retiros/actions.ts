"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { insertNotificacionesFiltradas } from "@/lib/notif-prefs";
import { revalidatePath } from "next/cache";

async function getLider() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: lider } = await supabase
    .from("empleados")
    .select("id, nombre, empresa_id, area_id")
    .eq("user_id", user.id)
    .single();
  if (!lider) throw new Error("Líder no encontrado");
  return lider;
}

async function notificarGerentes(empresaId: string, mensaje: string) {
  const admin = createAdminClient();
  const { data: gerentes } = await admin
    .from("empleados")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("rol", "gerente")
    .eq("activo", true);
  if (!gerentes?.length) return;
  await insertNotificacionesFiltradas(
    admin,
    gerentes.map((g) => ({
      empresa_id:      empresaId,
      destinatario_id: g.id,
      tipo:            "solicitud",
      mensaje,
    })),
  );
}

export async function solicitarRetiroLider(data: {
  fecha:       string;
  hora_retiro: string;
  motivo:      string;
}) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();

    const { error } = await admin.from("solicitudes_retiro").insert({
      empleado_id: lider.id,
      empresa_id:  lider.empresa_id,
      fecha:       data.fecha,
      hora_retiro: data.hora_retiro,
      motivo:      data.motivo,
      estado:      "pendiente",
    });

    if (error) return { error: error.message };

    await notificarGerentes(
      lider.empresa_id,
      `El líder ${lider.nombre} solicitó un retiro anticipado para el ${data.fecha} a las ${data.hora_retiro}.`
    );

    revalidatePath("/dashboard/lider/mis-retiros");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
