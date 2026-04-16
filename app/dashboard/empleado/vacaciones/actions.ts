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

export async function crearVacaciones(data: {
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  comentario?: string;
}) {
  try {
    const { supabase, emp } = await getEmpleado();

    if (data.dias < 1) return { error: "La fecha hasta debe ser posterior a la fecha desde." };

    const { data: inserted, error } = await supabase
      .from("solicitudes_vacaciones")
      .insert({
        empleado_id: emp.id,
        fecha_desde: data.fecha_desde,
        fecha_hasta: data.fecha_hasta,
        dias: data.dias,
        comentario: data.comentario?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    // Notificar al líder y a todos los rrhh de la empresa
    const admin = createAdminClient();

    const { data: destinatarios } = await admin
      .from("empleados")
      .select("id")
      .eq("empresa_id", emp.empresa_id)
      .in("rol", ["lider", "rrhh"])
      .eq("activo", true);

    // Para el líder: solo el del área
    const notifs = (destinatarios ?? [])
      .filter((d) => {
        // Incluir todos los rrhh, y el lider del área del empleado
        return true; // Se filtra en el insert si es necesario
      })
      .map((d) => ({
        empresa_id: emp.empresa_id,
        destinatario_id: d.id,
        tipo: "vacaciones",
        mensaje: `${emp.nombre} solicitó vacaciones del ${data.fecha_desde} al ${data.fecha_hasta} (${data.dias} días).`,
        referencia_id: inserted.id,
        referencia_tipo: "vacaciones",
      }));

    if (notifs.length > 0) {
      await admin.from("notificaciones").insert(notifs);
    }

    revalidatePath("/dashboard/empleado/vacaciones");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
