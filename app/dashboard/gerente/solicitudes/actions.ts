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
    owners.map((o) => ({ empresa_id: empresaId, destinatario_id: o.id, tipo: "solicitud", mensaje }))
  );
}

const TABLA_MAP = {
  ausencia:   "solicitudes_ausencia",
  retiro:     "solicitudes_retiro",
  vacaciones: "solicitudes_vacaciones",
} as const;

type TipoSol = keyof typeof TABLA_MAP;

export async function resolverSolicitudLider(data: {
  solicitudId:    string;
  tipo:           TipoSol;
  decision:       "aprobada" | "rechazada";
  motivoRechazo?: string;
  liderNombre:    string;
  liderEmpleadoId: string;
}) {
  try {
    const gerente = await getGerente();
    const admin   = createAdminClient();
    const tabla   = TABLA_MAP[data.tipo];

    const updateData: Record<string, unknown> = {
      estado:      data.decision,
      aprobado_por: gerente.id,
    };
    if (data.decision === "rechazada" && data.motivoRechazo) {
      updateData.motivo_rechazo = data.motivoRechazo;
    }

    const { error } = await admin.from(tabla).update(updateData).eq("id", data.solicitudId);
    if (error) return { error: error.message };

    const tipoLabel = { ausencia: "inasistencia", retiro: "retiro anticipado", vacaciones: "vacaciones" }[data.tipo];
    const accion    = data.decision === "aprobada" ? "aprobada" : "rechazada";

    // Notif al líder
    await admin.from("notificaciones").insert({
      empresa_id:      gerente.empresa_id,
      destinatario_id: data.liderEmpleadoId,
      tipo:            "solicitud",
      mensaje: data.decision === "aprobada"
        ? `Tu solicitud de ${tipoLabel} fue aprobada por el Gerente.`
        : `Tu solicitud de ${tipoLabel} fue rechazada. Motivo: ${data.motivoRechazo}`,
    });

    // Notif al owner
    await notificarOwner(
      gerente.empresa_id,
      `El Gerente ${gerente.nombre} ${accion} una solicitud de ${tipoLabel} del líder ${data.liderNombre}.`
    );

    revalidatePath("/dashboard/gerente/solicitudes");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
