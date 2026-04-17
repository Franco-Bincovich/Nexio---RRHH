/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type CriterioKey =
  | "cumplimiento"
  | "colaboracion"
  | "iniciativa"
  | "comunicacion"
  | "adaptabilidad";

export const CRITERIOS: { key: CriterioKey; label: string }[] = [
  { key: "cumplimiento",  label: "Cumplimiento de objetivos" },
  { key: "colaboracion",  label: "Colaboración" },
  { key: "iniciativa",    label: "Iniciativa" },
  { key: "comunicacion",  label: "Comunicación" },
  { key: "adaptabilidad", label: "Adaptabilidad" },
];

export type CriterioScores = Record<CriterioKey, number>;

export type ComentarioParsed = {
  criterios: CriterioScores | null;
  texto: string;
};

/** Promedio 1..5 de los 5 criterios (a dos decimales). */
export function promedioCriterios(scores: CriterioScores): number {
  const vals = CRITERIOS.map((c) => scores[c.key] ?? 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / vals.length) * 100) / 100;
}

/** El campo `puntuacion` de la tabla es 1..10: guardamos promedio×2. */
export function scoreParaDb(promedio1_5: number): number {
  return Math.round(promedio1_5 * 2 * 10) / 10;
}

export function score1_10A1_5(score: number): number {
  return Math.round((score / 2) * 100) / 100;
}

export function encodeComentario(scores: CriterioScores, texto: string): string {
  return JSON.stringify({ criterios: scores, texto: texto.trim() });
}

export function decodeComentario(raw: string | null | undefined): ComentarioParsed {
  if (!raw) return { criterios: null, texto: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.criterios) {
      return {
        criterios: parsed.criterios as CriterioScores,
        texto: typeof parsed.texto === "string" ? parsed.texto : "",
      };
    }
  } catch {
    // fallback: comentario plano pre-existente
  }
  return { criterios: null, texto: raw };
}

export type CicloConfig = {
  evaluaciones_activas: boolean;
  evaluaciones_activas_desde: string | null;
};

export async function getCicloConfig(
  admin: SupabaseClient<Database>,
  empresaId: string,
): Promise<CicloConfig> {
  const db = admin as any;
  const { data } = await db
    .from("empresa_config")
    .select("evaluaciones_activas, evaluaciones_activas_desde")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  return {
    evaluaciones_activas:       data?.evaluaciones_activas === true,
    evaluaciones_activas_desde: (data?.evaluaciones_activas_desde ?? null) as string | null,
  };
}
