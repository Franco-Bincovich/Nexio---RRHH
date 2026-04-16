import { createAdminClient } from "@/lib/supabase-admin";

export async function logAuditoria(data: {
  empresa_id: string;
  empleado_id?: string | null;
  accion: string;
  entidad?: string;
  entidad_id?: string;
  detalle?: Record<string, unknown>;
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("auditoria").insert({
      empresa_id: data.empresa_id,
      empleado_id: data.empleado_id ?? null,
      accion: data.accion,
      entidad: data.entidad ?? null,
      entidad_id: data.entidad_id ?? null,
      detalle: data.detalle ?? null,
    });
  } catch {
    // Audit failures must not break the main flow
  }
}
