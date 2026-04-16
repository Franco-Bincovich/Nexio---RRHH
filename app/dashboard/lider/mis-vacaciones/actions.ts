"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
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
  await admin.from("notificaciones").insert(
    gerentes.map((g) => ({
      empresa_id:      empresaId,
      destinatario_id: g.id,
      tipo:            "solicitud",
      mensaje,
    }))
  );
}

export async function solicitarVacacionesLider(data: {
  fecha_desde: string;
  fecha_hasta: string;
  dias:        number;
  comentario?: string;
}) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();

    const { error } = await admin.from("solicitudes_vacaciones").insert({
      empleado_id: lider.id,
      empresa_id:  lider.empresa_id,
      fecha_desde: data.fecha_desde,
      fecha_hasta: data.fecha_hasta,
      dias:        data.dias,
      comentario:  data.comentario ?? null,
      estado:      "pendiente",
    });

    if (error) return { error: error.message };

    await notificarGerentes(
      lider.empresa_id,
      `El líder ${lider.nombre} solicitó vacaciones del ${data.fecha_desde} al ${data.fecha_hasta} (${data.dias} días).`
    );

    revalidatePath("/dashboard/lider/mis-vacaciones");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
