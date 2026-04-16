"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

const TABLA: Record<string, string> = {
  ausencia:   "solicitudes_ausencia",
  retiro:     "solicitudes_retiro",
  vacaciones: "solicitudes_vacaciones",
};

const TIPO_LABEL: Record<string, string> = {
  ausencia:   "inasistencia",
  retiro:     "retiro anticipado",
  vacaciones: "vacaciones",
};

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

export async function resolverSolicitud(data: {
  solicitudId:   string;
  tipo:          "ausencia" | "retiro" | "vacaciones";
  decision:      "aprobada" | "rechazada";
  motivoRechazo?: string;
  empleadoId:    string;
  empleadoNombre: string;
}) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();

    const update: Record<string, string> = { estado: data.decision, aprobado_por: lider.id };
    if (data.decision === "rechazada" && data.motivoRechazo) {
      update.motivo_rechazo = data.motivoRechazo;
    }

    const { error } = await admin
      .from(TABLA[data.tipo])
      .update(update)
      .eq("id", data.solicitudId);

    if (error) return { error: error.message };

    const tipoLabel   = TIPO_LABEL[data.tipo];
    const decisionVerb = data.decision === "aprobada" ? "aprobó" : "rechazó";
    const decisionLabel = data.decision === "aprobada" ? "aprobada" : "rechazada";

    // Notif al empleado
    let msgEmpleado = `Tu solicitud de ${tipoLabel} fue ${decisionLabel}.`;
    if (data.decision === "rechazada" && data.motivoRechazo) {
      msgEmpleado += ` Motivo: ${data.motivoRechazo}`;
    }
    await admin.from("notificaciones").insert({
      empresa_id:      lider.empresa_id,
      destinatario_id: data.empleadoId,
      tipo:            "solicitud",
      mensaje:         msgEmpleado,
    });

    // Notif a gerentes
    await notificarGerentes(
      lider.empresa_id,
      `El líder ${lider.nombre} ${decisionVerb} una solicitud de ${tipoLabel} de ${data.empleadoNombre}.`
    );

    revalidatePath("/dashboard/lider/solicitudes");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
