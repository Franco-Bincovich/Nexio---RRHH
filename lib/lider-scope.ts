import { createAdminClient } from "./supabase-admin";

export type LiderScope = {
  id: string;
  empresa_id: string;
  area_id: string | null;
  es_demo: boolean;
  area_nombre: string | null;
  nombre: string;
};

/**
 * Devuelve el scope visible por el usuario en el panel.
 * Usa admin client (bypass RLS) para poder detectar `es_demo`
 * incluso si el usuario no tiene permisos de lectura sobre su propio registro.
 */
export async function getLiderScope(userId: string): Promise<LiderScope | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("empleados")
    .select("id, nombre, empresa_id, area_id, es_demo, areas!empleados_area_id_fkey(nombre)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const areas = data.areas as { nombre: string } | { nombre: string }[] | null;
  const area_nombre = Array.isArray(areas)
    ? areas[0]?.nombre ?? null
    : areas?.nombre ?? null;
  return {
    id: data.id,
    nombre: data.nombre,
    empresa_id: data.empresa_id,
    area_id: data.area_id ?? null,
    es_demo: data.es_demo === true,
    area_nombre,
  };
}

// Alias semánticos — misma forma, pero usable desde paneles de empleado u otros.
export type EmpleadoScope = LiderScope;
export const getEmpleadoScope = getLiderScope;
