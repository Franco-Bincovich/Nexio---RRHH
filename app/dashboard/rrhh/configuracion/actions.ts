"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { logAuditoria } from "@/lib/auditoria";

async function getRrhhContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, empresa_id, rol, es_demo")
    .eq("user_id", user.id)
    .single();
  if (!emp) return null;
  if (!emp.es_demo && emp.rol !== "rrhh") return null;
  return { ...emp, supabase };
}

// Upsert helper for empresa_config
async function upsertConfig(empresaId: string, patch: Record<string, unknown>) {
  const admin = createAdminClient() as never as ReturnType<typeof createAdminClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { error } = await db
    .from("empresa_config")
    .upsert({ empresa_id: empresaId, ...patch }, { onConflict: "empresa_id" });
  return error;
}

export async function guardarDatosEmpresa(
  nombre: string,
  logoUrl: string | null
): Promise<{ error?: string }> {
  const ctx = await getRrhhContext();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error: empError } = await admin
    .from("empresas")
    .update({ nombre: nombre.trim() })
    .eq("id", ctx.empresa_id);
  if (empError) return { error: empError.message };

  const cfgError = await upsertConfig(ctx.empresa_id, { logo_url: logoUrl });
  if (cfgError) return { error: cfgError.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.id,
    accion: "guardar_datos_empresa",
    detalle: { nombre: nombre.trim() },
  });

  revalidatePath("/dashboard/rrhh/configuracion");
  return {};
}

export async function guardarPoliticas(data: {
  dias_vacaciones: number;
  hora_entrada: string;
  hora_salida: string;
  modalidades_habilitadas: string[];
  password_default: string;
}): Promise<{ error?: string }> {
  const ctx = await getRrhhContext();
  if (!ctx) return { error: "No autorizado" };
  if (!data.password_default.trim()) return { error: "La contraseña no puede estar vacía." };
  if (data.dias_vacaciones < 0 || data.dias_vacaciones > 365) return { error: "Días de vacaciones inválidos." };

  const cfgError = await upsertConfig(ctx.empresa_id, data);
  if (cfgError) return { error: cfgError.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.id,
    accion: "guardar_politicas",
    detalle: { dias_vacaciones: data.dias_vacaciones, hora_entrada: data.hora_entrada },
  });

  revalidatePath("/dashboard/rrhh/configuracion");
  return {};
}

export async function guardarNotificaciones(data: {
  notif_ausentismo: boolean;
  notif_objetivos_vencidos: boolean;
  notif_resumen_semanal: boolean;
  notif_nuevos_empleados: boolean;
}): Promise<{ error?: string }> {
  const ctx = await getRrhhContext();
  if (!ctx) return { error: "No autorizado" };

  const cfgError = await upsertConfig(ctx.empresa_id, data);
  if (cfgError) return { error: cfgError.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.id,
    accion: "toggle_modulo",
    entidad: "empresa_config",
    entidad_id: ctx.empresa_id,
    detalle: data as unknown as Record<string, unknown>,
  });

  return {};
}

export type ImportRow = {
  nombre: string;
  email: string;
  area_nombre: string;
  rol: string;
  modalidad: string;
  horas_laborables: number;
  password: string;
};

export type ImportResult = {
  email: string;
  nombre: string;
  ok: boolean;
  error?: string;
};

export async function importarEmpleados(
  rows: ImportRow[]
): Promise<{ results: ImportResult[]; error?: string }> {
  const ctx = await getRrhhContext();
  if (!ctx) return { results: [], error: "No autorizado" };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  // Fetch areas for name resolution
  const { data: areas } = await admin
    .from("areas")
    .select("id, nombre")
    .eq("empresa_id", ctx.empresa_id);
  const areaMap: Record<string, string> = {};
  (areas ?? []).forEach((a) => {
    areaMap[a.nombre.toLowerCase().trim()] = a.id;
  });

  const results: ImportResult[] = [];

  for (const row of rows) {
    try {
      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email: row.email.trim(),
          password: row.password || "nexio1234",
          email_confirm: true,
          user_metadata: { nombre: row.nombre.trim() },
        });
      if (authError) {
        results.push({ email: row.email, nombre: row.nombre, ok: false, error: authError.message });
        continue;
      }

      const areaId = row.area_nombre
        ? (areaMap[row.area_nombre.toLowerCase().trim()] ?? null)
        : null;

      const { error: insertError } = await adminAny
        .from("empleados")
        .insert({
          user_id: authData.user.id,
          empresa_id: ctx.empresa_id,
          nombre: row.nombre.trim(),
          email: row.email.trim(),
          area_id: areaId,
          rol: (["empleado","lider","gerente","rrhh"].includes(row.rol) ? row.rol : "empleado") as never,
          modalidad: (["presencial","remoto","hibrido"].includes(row.modalidad) ? row.modalidad : "presencial") as never,
          horas_laborables: row.horas_laborables || 8,
        });

      if (insertError) {
        await admin.auth.admin.deleteUser(authData.user.id);
        results.push({ email: row.email, nombre: row.nombre, ok: false, error: insertError.message });
      } else {
        results.push({ email: row.email, nombre: row.nombre, ok: true });
      }
    } catch (e) {
      results.push({ email: row.email, nombre: row.nombre, ok: false, error: String(e) });
    }
  }

  const creados = results.filter((r) => r.ok).length;
  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.id,
    accion: "importar_empleados",
    detalle: { cantidad: creados, total: rows.length },
  });

  revalidatePath("/dashboard/rrhh/empleados");
  revalidatePath("/dashboard/rrhh/configuracion");
  return { results };
}
