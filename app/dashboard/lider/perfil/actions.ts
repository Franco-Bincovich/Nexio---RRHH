"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function getLider() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: lider } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();
  if (!lider) throw new Error("Líder no encontrado");
  return { supabase, user, lider };
}

export async function guardarPerfilLider(formData: FormData) {
  try {
    const { supabase, lider } = await getLider();

    const updates: Record<string, string> = {};
    for (const key of ["nombre", "telefono", "direccion", "contacto_emergencia_nombre", "contacto_emergencia_telefono"]) {
      const val = formData.get(key);
      if (val !== null) updates[key] = val.toString();
    }

    const { error } = await supabase
      .from("empleados")
      .update(updates)
      .eq("id", lider.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/lider/perfil");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function subirAvatarLider(formData: FormData) {
  try {
    const { supabase, user, lider } = await getLider();
    const file = formData.get("avatar") as File | null;
    if (!file || file.size === 0) return { error: "No se recibió archivo" };

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext)) {
      return { error: "Formato no permitido. Usá JPG o PNG." };
    }
    if (file.size > 3 * 1024 * 1024) return { error: "El archivo supera 3 MB" };

    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("empleados")
      .update({ avatar_url: avatarUrl })
      .eq("id", lider.id);

    if (updateError) return { error: updateError.message };
    revalidatePath("/dashboard/lider/perfil");
    return { ok: true, url: avatarUrl };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function subirDocumentoLider(formData: FormData) {
  try {
    const { supabase, user } = await getLider();
    const file = formData.get("documento") as File | null;
    if (!file || file.size === 0) return { error: "No se recibió archivo" };

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "pdf", "docx", "xlsx"].includes(ext)) {
      return { error: "Formato no permitido. JPG, PNG, PDF, DOCX o XLSX." };
    }
    if (file.size > 10 * 1024 * 1024) return { error: "El archivo supera 10 MB" };

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("empleado-docs")
      .upload(path, file, { contentType: file.type });

    if (uploadError) return { error: uploadError.message };
    revalidatePath("/dashboard/lider/perfil");
    return { ok: true, path };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function eliminarDocumentoLider(path: string) {
  try {
    const { supabase, user } = await getLider();
    if (!path.startsWith(`${user.id}/`)) return { error: "No autorizado" };

    const { error } = await supabase.storage.from("empleado-docs").remove([path]);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/lider/perfil");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function guardarPreferenciasNotifLider(prefs: Record<string, boolean>) {
  try {
    const { supabase, lider } = await getLider();
    const { error } = await supabase
      .from("empleados")
      .update({ notif_preferencias: prefs })
      .eq("id", lider.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard/lider/perfil");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
