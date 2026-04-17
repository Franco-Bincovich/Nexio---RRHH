"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { insertNotificacionesFiltradas } from "@/lib/notif-prefs";
import { revalidatePath } from "next/cache";

async function getGerente() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: g } = await supabase
    .from("empleados")
    .select("id, nombre, empresa_id")
    .eq("user_id", user.id)
    .single();
  if (!g) throw new Error("Gerente no encontrado");
  return g;
}

async function notificarOwner(empresaId: string, mensaje: string) {
  const admin = createAdminClient();
  const { data: owners } = await admin
    .from("empleados")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("rol", "owner")
    .eq("activo", true);
  if (!owners?.length) return;
  await insertNotificacionesFiltradas(
    admin,
    owners.map((o) => ({
      empresa_id:      empresaId,
      destinatario_id: o.id,
      tipo:            "solicitud",
      mensaje,
    })),
  );
}

export async function solicitarRetiroGerente(data: {
  fecha:       string;
  hora_retiro: string;
  motivo:      string;
}) {
  try {
    const gerente = await getGerente();
    const admin   = createAdminClient();

    const { error } = await admin.from("solicitudes_retiro").insert({
      empleado_id:  gerente.id,
      empresa_id:   gerente.empresa_id,
      fecha:        data.fecha,
      hora_retiro:  data.hora_retiro,
      motivo:       data.motivo,
      estado:       "aprobada",
      aprobado_por: gerente.id,
    });

    if (error) return { error: error.message };

    await notificarOwner(
      gerente.empresa_id,
      `El gerente ${gerente.nombre} registró un retiro anticipado para el ${data.fecha} a las ${data.hora_retiro}.`
    );

    revalidatePath("/dashboard/gerente/mis-retiros");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
