"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function getGerente() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: g } = await supabase.from("empleados").select("id, empresa_id").eq("user_id", user.id).single();
  if (!g) throw new Error("No encontrado");
  return { supabase, user, g };
}

export async function guardarPerfilGerente(formData: FormData) {
  try {
    const { supabase, g } = await getGerente();
    const updates: Record<string, string> = {};
    for (const key of ["nombre", "telefono", "direccion", "contacto_emergencia_nombre", "contacto_emergencia_telefono"]) {
      const val = formData.get(key);
      if (val !== null) updates[key] = val.toString();
    }
    const { error } = await supabase.from("empleados").update(updates).eq("id", g.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/gerente/perfil");
    return { ok: true };
  } catch (e: unknown) { return { error: e instanceof Error ? e.message : "Error" }; }
}

export async function subirAvatarGerente(formData: FormData) {
  try {
    const { supabase, user, g } = await getGerente();
    const file = formData.get("avatar") as File | null;
    if (!file || file.size === 0) return { error: "No se recibió archivo" };
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext)) return { error: "Formato no permitido." };
    if (file.size > 3 * 1024 * 1024) return { error: "El archivo supera 3 MB" };
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) return { error: uploadError.message };
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("empleados").update({ avatar_url: avatarUrl }).eq("id", g.id);
    if (updateError) return { error: updateError.message };
    revalidatePath("/dashboard/gerente/perfil");
    return { ok: true, url: avatarUrl };
  } catch (e: unknown) { return { error: e instanceof Error ? e.message : "Error" }; }
}

export async function subirDocumentoGerente(formData: FormData) {
  try {
    const { supabase, user } = await getGerente();
    const file = formData.get("documento") as File | null;
    if (!file || file.size === 0) return { error: "No se recibió archivo" };
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "pdf", "docx", "xlsx"].includes(ext)) return { error: "Formato no permitido." };
    if (file.size > 10 * 1024 * 1024) return { error: "El archivo supera 10 MB" };
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from("empleado-docs").upload(path, file, { contentType: file.type });
    if (uploadError) return { error: uploadError.message };
    revalidatePath("/dashboard/gerente/perfil");
    return { ok: true, path };
  } catch (e: unknown) { return { error: e instanceof Error ? e.message : "Error" }; }
}

export async function eliminarDocumentoGerente(path: string) {
  try {
    const { supabase, user } = await getGerente();
    if (!path.startsWith(`${user.id}/`)) return { error: "No autorizado" };
    const { error } = await supabase.storage.from("empleado-docs").remove([path]);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/gerente/perfil");
    return { ok: true };
  } catch (e: unknown) { return { error: e instanceof Error ? e.message : "Error" }; }
}

export async function guardarPreferenciasNotifGerente(prefs: Record<string, boolean>) {
  try {
    const { supabase, g } = await getGerente();
    const { error } = await supabase.from("empleados").update({ notif_preferencias: prefs }).eq("id", g.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/gerente/perfil");
    return { ok: true };
  } catch (e: unknown) { return { error: e instanceof Error ? e.message : "Error" }; }
}
