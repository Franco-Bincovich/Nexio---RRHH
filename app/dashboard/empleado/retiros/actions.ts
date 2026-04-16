"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

async function getEmpleado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, empresa_id, area_id, nombre")
    .eq("user_id", user.id)
    .single();
  if (!emp) throw new Error("Empleado no encontrado");
  return { supabase, emp };
}

async function notificarLider(empresaId: string, areaId: string | null, mensaje: string, referenciaId: string) {
  if (!areaId) return;
  const admin = createAdminClient();
  const { data: lider } = await admin
    .from("empleados")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("area_id", areaId)
    .eq("rol", "lider")
    .eq("activo", true)
    .single();

  if (lider) {
    await admin.from("notificaciones").insert({
      empresa_id: empresaId,
      destinatario_id: lider.id,
      tipo: "retiro",
      mensaje,
      referencia_id: referenciaId,
      referencia_tipo: "retiro",
    });
  }
}

export async function crearRetiro(data: {
  fecha: string;
  hora_retiro: string;
  motivo: string;
}) {
  try {
    const { supabase, emp } = await getEmpleado();

    if (!data.motivo || data.motivo.trim().length < 20) {
      return { error: "El motivo debe tener al menos 20 caracteres." };
    }

    const { data: inserted, error } = await supabase
      .from("solicitudes_retiro")
      .insert({
        empleado_id: emp.id,
        fecha: data.fecha,
        hora_retiro: data.hora_retiro,
        motivo: data.motivo.trim(),
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    await notificarLider(
      emp.empresa_id,
      emp.area_id,
      `${emp.nombre} solicitó retiro anticipado el ${data.fecha} a las ${data.hora_retiro}.`,
      inserted.id
    );

    revalidatePath("/dashboard/empleado/retiros");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
