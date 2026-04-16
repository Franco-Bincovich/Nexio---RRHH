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

async function notificarLider(empresaId: string, areaId: string | null, mensaje: string, referenciaId: string, tipo: string) {
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
      tipo,
      mensaje,
      referencia_id: referenciaId,
      referencia_tipo: tipo,
    });
  }
}

export async function crearAusencia(data: {
  fecha: string;
  motivo: string;
  tipo: "enfermedad" | "personal" | "otro";
}) {
  try {
    const { supabase, emp } = await getEmpleado();

    if (!data.motivo || data.motivo.trim().length < 20) {
      return { error: "El motivo debe tener al menos 20 caracteres." };
    }

    const { data: inserted, error } = await supabase
      .from("solicitudes_ausencia")
      .insert({
        empleado_id: emp.id,
        fecha: data.fecha,
        motivo: data.motivo.trim(),
        tipo: data.tipo,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    await notificarLider(
      emp.empresa_id,
      emp.area_id,
      `${emp.nombre} solicitó una inasistencia para el ${data.fecha} (${data.tipo}).`,
      inserted.id,
      "ausencia"
    );

    revalidatePath("/dashboard/empleado/ausencias");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
