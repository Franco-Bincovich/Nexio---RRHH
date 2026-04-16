"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function getEmpresaId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id, rol")
    .eq("user_id", user.id)
    .single();
  if (!emp || emp.rol !== "rrhh") return null;
  return emp.empresa_id;
}

export async function crearArea(data: {
  nombre: string;
  lider_id: string | null;
}): Promise<{ error?: string }> {
  const empresa_id = await getEmpresaId();
  if (!empresa_id) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin.from("areas").insert({
    empresa_id,
    nombre: data.nombre.trim(),
    lider_id: data.lider_id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/rrhh/areas");
  return {};
}

export async function editarArea(
  id: string,
  data: { nombre: string; lider_id: string | null }
): Promise<{ error?: string }> {
  const empresa_id = await getEmpresaId();
  if (!empresa_id) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("areas")
    .update({ nombre: data.nombre.trim(), lider_id: data.lider_id })
    .eq("id", id)
    .eq("empresa_id", empresa_id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/rrhh/areas");
  return {};
}

export async function eliminarArea(id: string): Promise<{ error?: string }> {
  const empresa_id = await getEmpresaId();
  if (!empresa_id) return { error: "No autorizado" };

  const admin = createAdminClient();

  const { count } = await admin
    .from("empleados")
    .select("*", { count: "exact", head: true })
    .eq("area_id", id)
    .eq("activo", true);

  if (count && count > 0) {
    return { error: `El área tiene ${count} empleado${count > 1 ? "s" : ""} activo${count > 1 ? "s" : ""}. Reasignalos antes de eliminarla.` };
  }

  const { error } = await admin.from("areas").delete().eq("id", id).eq("empresa_id", empresa_id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/rrhh/areas");
  return {};
}
