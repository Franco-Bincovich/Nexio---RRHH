import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type PrefKey =
  | "ausencias"
  | "solicitudes"
  | "objetivos"
  | "capacitaciones"
  | "temperatura"
  | "foros"
  | "resumen_semanal";

export const PREF_LABELS: Record<PrefKey, string> = {
  ausencias:       "Ausencias, retiros y vacaciones",
  solicitudes:     "Respuestas a mis solicitudes",
  objetivos:       "Objetivos",
  capacitaciones:  "Capacitaciones",
  temperatura:     "Temperatura del equipo",
  foros:           "Foros y comunicaciones",
  resumen_semanal: "Resumen semanal",
};

export const PREFS_DEFAULT: Record<PrefKey, boolean> = {
  ausencias:       true,
  solicitudes:     true,
  objetivos:       true,
  capacitaciones:  true,
  temperatura:     true,
  foros:           true,
  resumen_semanal: true,
};

// Mapea el valor del campo `tipo` (en notificaciones) a la key del JSON de preferencias.
// Si un `tipo` no está mapeado acá se asume que la notificación no es silenciable.
const TIPO_A_PREF: Record<string, PrefKey> = {
  ausencia:        "ausencias",
  retiro:          "ausencias",
  vacaciones:      "ausencias",
  solicitud:       "solicitudes",
  objetivo:        "objetivos",
  capacitacion:    "capacitaciones",
  temperatura:     "temperatura",
  foro:            "foros",
  resumen_semanal: "resumen_semanal",
};

export function getPrefKey(tipo: string): PrefKey | null {
  return TIPO_A_PREF[tipo] ?? null;
}

export function mergeWithDefault(
  prefs: Record<string, boolean> | null | undefined,
): Record<PrefKey, boolean> {
  return { ...PREFS_DEFAULT, ...(prefs ?? {}) } as Record<PrefKey, boolean>;
}

/** Devuelve true si el tipo está habilitado (o si no es silenciable, o si no hay prefs). */
export function prefsHabilita(
  prefs: Record<string, boolean> | null | undefined,
  tipo: string,
): boolean {
  const key = getPrefKey(tipo);
  if (!key) return true;
  const merged = mergeWithDefault(prefs);
  return merged[key] !== false;
}

type NotifInsert = {
  empresa_id: string;
  destinatario_id: string;
  tipo: string;
  mensaje: string;
  referencia_id?: string | null;
  referencia_tipo?: string | null;
};

/**
 * Inserta una o varias notificaciones, omitiendo las que el destinatario tiene
 * silenciadas en `notif_preferencias`. Requiere admin client (bypass RLS).
 */
export async function insertNotificacionesFiltradas(
  admin: SupabaseClient<Database>,
  payloads: NotifInsert | NotifInsert[],
): Promise<void> {
  const list = Array.isArray(payloads) ? payloads : [payloads];
  if (list.length === 0) return;

  const destinatarioIds = Array.from(new Set(list.map((p) => p.destinatario_id)));
  const { data: empleados } = await admin
    .from("empleados")
    .select("id, notif_preferencias")
    .in("id", destinatarioIds);

  const prefsMap = new Map<string, Record<string, boolean> | null>();
  for (const e of empleados ?? []) {
    prefsMap.set(e.id, (e.notif_preferencias ?? null) as Record<string, boolean> | null);
  }

  const filtrados = list.filter((p) => prefsHabilita(prefsMap.get(p.destinatario_id), p.tipo));
  if (filtrados.length === 0) return;

  await admin.from("notificaciones").insert(filtrados);
}

export async function getPreferencias(
  admin: SupabaseClient<Database>,
  empleadoId: string,
): Promise<Record<PrefKey, boolean>> {
  const { data } = await admin
    .from("empleados")
    .select("notif_preferencias")
    .eq("id", empleadoId)
    .maybeSingle();
  return mergeWithDefault(data?.notif_preferencias);
}
