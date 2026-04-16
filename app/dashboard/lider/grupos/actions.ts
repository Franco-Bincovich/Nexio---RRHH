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
    .select("id, empresa_id, area_id")
    .eq("user_id", user.id)
    .single();
  if (!lider) throw new Error("Líder no encontrado");
  return lider;
}

export async function crearGrupo(data: {
  nombre: string;
  descripcion: string | null;
  miembrosIds: string[];
}) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();

    const { data: nuevo, error } = await admin
      .from("grupos")
      .insert({
        empresa_id:  lider.empresa_id,
        area_id:     lider.area_id,
        nombre:      data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        creado_por:  lider.id,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    if (data.miembrosIds.length > 0) {
      const { error: miembroError } = await admin.from("grupos_miembros").insert(
        data.miembrosIds.map((empleadoId) => ({
          grupo_id:    nuevo.id,
          empleado_id: empleadoId,
        }))
      );
      if (miembroError) console.error("[crearGrupo] Error miembros:", miembroError.message);
    }

    revalidatePath("/dashboard/lider/grupos");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function eliminarGrupo(grupoId: string) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();
    const { error } = await admin
      .from("grupos")
      .delete()
      .eq("id", grupoId)
      .eq("empresa_id", lider.empresa_id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/lider/grupos");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function agregarMiembro(grupoId: string, empleadoId: string) {
  try {
    const lider = await getLider();
    void lider;
    const admin = createAdminClient();
    const { error } = await admin.from("grupos_miembros").insert({
      grupo_id:    grupoId,
      empleado_id: empleadoId,
    });
    if (error) {
      if (error.code === "23505") return { error: "El empleado ya es miembro del grupo." };
      return { error: error.message };
    }
    revalidatePath("/dashboard/lider/grupos");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function eliminarMiembro(miembroId: string) {
  try {
    const lider = await getLider();
    void lider;
    const admin = createAdminClient();
    const { error } = await admin.from("grupos_miembros").delete().eq("id", miembroId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/lider/grupos");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
