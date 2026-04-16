"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

async function getRrhhEmpleado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("empleados")
    .select("id, empresa_id, rol")
    .eq("user_id", user.id)
    .single();
  if (!data || data.rol !== "rrhh") return null;
  return data;
}

export async function crearMensaje(
  empresaId: string,
  areaId: string | null,
  mensaje: string
): Promise<{ error?: string }> {
  const me = await getRrhhEmpleado();
  if (!me) return { error: "No autorizado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("foros_mensajes").insert({
    empresa_id: empresaId,
    area_id: areaId,
    autor_id: me.id,
    mensaje: mensaje.trim(),
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/rrhh/foros");
  return {};
}

export async function eliminarMensaje(id: string): Promise<{ error?: string }> {
  const me = await getRrhhEmpleado();
  if (!me) return { error: "No autorizado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("foros_mensajes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/rrhh/foros");
  return {};
}
