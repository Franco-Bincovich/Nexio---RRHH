"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

function fmt(val: string | number | null | undefined): string {
  if (val === null || val === undefined || String(val).trim() === "") return "(vacío)";
  return String(val);
}

async function getLider() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: lider } = await supabase
    .from("empleados")
    .select("id, nombre, empresa_id")
    .eq("user_id", user.id)
    .single();
  if (!lider) throw new Error("Líder no encontrado");
  return lider;
}

export async function asignarObjetivo(data: {
  empleadoIds: string[];
  titulo: string;
  descripcion: string | null;
  vencimiento: string | null;
  categoria: string | null;
}) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();

    for (const empleadoId of data.empleadoIds) {
      const { data: nuevo, error: insertError } = await admin
        .from("objetivos")
        .insert({
          empresa_id:   lider.empresa_id,
          empleado_id:  empleadoId,
          asignado_por: lider.id,
          titulo:       data.titulo,
          descripcion:  data.descripcion,
          vencimiento:  data.vencimiento,
          categoria:    data.categoria,
        })
        .select("id")
        .single();

      if (insertError) return { error: insertError.message };

      const { error: histError } = await admin.from("objetivos_historial").insert({
        objetivo_id:      nuevo.id,
        empresa_id:       lider.empresa_id,
        lider_id:         lider.id,
        lider_nombre:     lider.nombre,
        campo_modificado: "creado",
        valor_anterior:   null,
        valor_nuevo:      data.titulo,
      });
      if (histError) console.error("[asignarObjetivo] Error historial:", histError.message);
    }

    revalidatePath("/dashboard/lider/objetivos");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function editarObjetivo(data: {
  objetivoId: string;
  titulo: string;
  descripcion: string | null;
  progreso: number;
  estado: string;
  vencimiento: string | null;
  categoria: string | null;
  original: {
    titulo: string;
    descripcion: string | null;
    progreso: number;
    estado: string;
    vencimiento: string | null;
    categoria: string | null;
  };
}) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();

    const { error: updateError } = await admin
      .from("objetivos")
      .update({
        titulo:      data.titulo,
        descripcion: data.descripcion || null,
        progreso:    data.progreso,
        estado:      data.estado,
        vencimiento: data.vencimiento || null,
        categoria:   data.categoria || null,
      })
      .eq("id", data.objetivoId);

    if (updateError) return { error: updateError.message };

    const campos = [
      { campo: "titulo",      antes: data.original.titulo,      despues: data.titulo },
      { campo: "descripcion", antes: data.original.descripcion, despues: data.descripcion },
      { campo: "progreso",    antes: data.original.progreso,    despues: data.progreso },
      { campo: "estado",      antes: data.original.estado,      despues: data.estado },
      { campo: "vencimiento", antes: data.original.vencimiento, despues: data.vencimiento },
      { campo: "categoria",   antes: data.original.categoria,   despues: data.categoria },
    ];

    const cambios = campos.filter((c) => fmt(c.antes) !== fmt(c.despues));

    if (cambios.length > 0) {
      const { error: histError } = await admin.from("objetivos_historial").insert(
        cambios.map((c) => ({
          objetivo_id:      data.objetivoId,
          empresa_id:       lider.empresa_id,
          lider_id:         lider.id,
          lider_nombre:     lider.nombre,
          campo_modificado: c.campo,
          valor_anterior:   fmt(c.antes),
          valor_nuevo:      fmt(c.despues),
        }))
      );
      if (histError) {
        console.error("[editarObjetivo] Error historial:", histError.message);
        return { error: `Error al guardar historial: ${histError.message}` };
      }
    }

    revalidatePath("/dashboard/lider/objetivos");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function eliminarObjetivo(objetivoId: string, tituloObjetivo: string) {
  try {
    const lider = await getLider();
    const admin = createAdminClient();

    // Insertar historial ANTES del delete (objetivo_id quedará NULL por ON DELETE SET NULL)
    const { error: histError } = await admin.from("objetivos_historial").insert({
      objetivo_id:      objetivoId,
      empresa_id:       lider.empresa_id,
      lider_id:         lider.id,
      lider_nombre:     lider.nombre,
      campo_modificado: "eliminado",
      valor_anterior:   tituloObjetivo,
      valor_nuevo:      "ELIMINADO",
    });
    if (histError) console.error("[eliminarObjetivo] Error historial:", histError.message);

    const { error } = await admin.from("objetivos").delete().eq("id", objetivoId);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/lider/objetivos");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function getHistorialObjetivo(objetivoId: string) {
  try {
    const lider = await getLider();
    void lider; // solo verifica auth
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("objetivos_historial")
      .select("id, lider_nombre, campo_modificado, valor_anterior, valor_nuevo, fecha")
      .eq("objetivo_id", objetivoId)
      .order("fecha", { ascending: false });
    if (error) return { error: error.message, data: null };
    return { data: data ?? [], error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido", data: null };
  }
}
