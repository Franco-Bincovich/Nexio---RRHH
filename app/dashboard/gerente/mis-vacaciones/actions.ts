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
  await admin.from("notificaciones").insert(
    owners.map((o) => ({
      empresa_id:      empresaId,
      destinatario_id: o.id,
      tipo:            "solicitud",
      mensaje,
    }))
  );
}

export async function solicitarVacacionesGerente(data: {
  fecha_desde: string;
  fecha_hasta: string;
  dias:        number;
  comentario?: string;
}) {
  try {
    const gerente = await getGerente();
    const admin   = createAdminClient();

    const { error } = await admin.from("solicitudes_vacaciones").insert({
      empleado_id:  gerente.id,
      empresa_id:   gerente.empresa_id,
      fecha_desde:  data.fecha_desde,
      fecha_hasta:  data.fecha_hasta,
      dias:         data.dias,
      comentario:   data.comentario ?? null,
      estado:       "aprobada",
      aprobado_por: gerente.id,
    });

    if (error) return { error: error.message };

    await notificarOwner(
      gerente.empresa_id,
      `El gerente ${gerente.nombre} registró vacaciones del ${data.fecha_desde} al ${data.fecha_hasta} (${data.dias} días).`
    );

    revalidatePath("/dashboard/gerente/mis-vacaciones");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
