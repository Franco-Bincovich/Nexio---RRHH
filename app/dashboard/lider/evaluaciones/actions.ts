"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { logAuditoria } from "@/lib/auditoria";
import {
  encodeComentario,
  promedioCriterios,
  scoreParaDb,
  getCicloConfig,
  type CriterioScores,
  type CriterioKey,
} from "@/lib/evaluaciones";

const CRITERIO_KEYS: CriterioKey[] = [
  "cumplimiento", "colaboracion", "iniciativa", "comunicacion", "adaptabilidad",
];

function validarScores(scores: CriterioScores): string | null {
  for (const k of CRITERIO_KEYS) {
    const v = scores[k];
    if (typeof v !== "number" || v < 1 || v > 5 || !Number.isFinite(v)) {
      return `El criterio "${k}" debe estar entre 1 y 5.`;
    }
  }
  return null;
}

export async function crearEvaluacion(data: {
  empleadoId: string;
  scores: CriterioScores;
  comentario: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, empresa_id, rol, area_id, es_demo")
    .eq("user_id", user.id)
    .single();
  if (!lider) return { error: "No autorizado" };

  const admin = createAdminClient() as any;

  // Validar ciclo activo
  const ciclo = await getCicloConfig(admin, lider.empresa_id);
  if (!ciclo.evaluaciones_activas) {
    return { error: "El ciclo de evaluaciones no está activo." };
  }

  // Validar scores
  const err = validarScores(data.scores);
  if (err) return { error: err };

  // Validar que el empleado pertenezca al scope del líder (área o empresa si demo)
  const { data: target } = await admin
    .from("empleados")
    .select("id, empresa_id, area_id")
    .eq("id", data.empleadoId)
    .maybeSingle();
  if (!target || target.empresa_id !== lider.empresa_id) {
    return { error: "Empleado no encontrado en tu empresa." };
  }
  if (!lider.es_demo && lider.area_id && target.area_id !== lider.area_id) {
    return { error: "Ese empleado no está en tu área." };
  }

  const prom = promedioCriterios(data.scores);
  const puntuacion = scoreParaDb(prom);
  const comentario = encodeComentario(data.scores, data.comentario);

  const { data: inserted, error: insertErr } = await admin
    .from("evaluaciones")
    .insert({
      empresa_id:   lider.empresa_id,
      empleado_id:  data.empleadoId,
      evaluador_id: lider.id,
      tipo:         "desempeño",
      puntuacion,
      comentario,
      estado:       "completada",
    })
    .select("id")
    .single();

  if (insertErr) return { error: insertErr.message };

  await logAuditoria({
    empresa_id: lider.empresa_id,
    empleado_id: lider.id,
    accion: "crear_evaluacion",
    entidad: "evaluaciones",
    entidad_id: inserted?.id,
    detalle: {
      empleado_id: data.empleadoId,
      criterios: data.scores,
      promedio: prom,
    },
  });

  revalidatePath("/dashboard/lider/evaluaciones");
  revalidatePath("/dashboard/empleado/evaluaciones");
  revalidatePath("/dashboard/rrhh/evaluaciones");
  revalidatePath("/dashboard/gerente/evaluaciones");
  return {};
}
