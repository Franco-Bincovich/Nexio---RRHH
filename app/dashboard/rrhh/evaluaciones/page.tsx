/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCicloConfig, decodeComentario, score1_10A1_5 } from "@/lib/evaluaciones";
import EvaluacionesRrhhClient, { type EmpleadoResumen, type AreaMini } from "./EvaluacionesRrhhClient";

export default async function RrhhEvaluacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rrhh } = await supabase
    .from("empleados")
    .select("id, empresa_id, rol, es_demo")
    .eq("user_id", user.id)
    .single();
  if (!rrhh) redirect("/login");
  if (!rrhh.es_demo && rrhh.rol !== "rrhh") redirect("/login");

  const admin = createAdminClient();
  const ciclo = await getCicloConfig(admin, rrhh.empresa_id);

  const { data: empleados } = await admin
    .from("empleados")
    .select("id, nombre, rol, area_id, areas!empleados_area_id_fkey(nombre)")
    .eq("empresa_id", rrhh.empresa_id)
    .eq("activo", true)
    .order("nombre");

  const { data: areasRaw } = await admin
    .from("areas")
    .select("id, nombre")
    .eq("empresa_id", rrhh.empresa_id)
    .order("nombre");

  type EmpleadoInfo = {
    id: string;
    nombre: string;
    rol: string;
    area_id: string | null;
    area_nombre: string | null;
  };

  const empMap = new Map<string, EmpleadoInfo>();
  for (const e of (empleados ?? [])) {
    const areas = e.areas as { nombre: string } | { nombre: string }[] | null;
    const area_nombre = Array.isArray(areas) ? areas[0]?.nombre ?? null : areas?.nombre ?? null;
    empMap.set(e.id, {
      id: e.id,
      nombre: e.nombre,
      rol: e.rol,
      area_id: e.area_id ?? null,
      area_nombre,
    });
  }

  // Evaluaciones del ciclo actual (si hay fecha de activación, filtra desde ahí; si no, trae todas)
  let query = (admin as any)
    .from("evaluaciones")
    .select("id, empleado_id, puntuacion, comentario, estado, created_at, tipo")
    .eq("empresa_id", rrhh.empresa_id)
    .eq("tipo", "desempeño");
  if (ciclo.evaluaciones_activas_desde) {
    query = query.gte("created_at", ciclo.evaluaciones_activas_desde);
  }
  const { data: evals } = await query;

  // Agregar por empleado
  type AggEntry = { puntuacionesSum: number; puntuacionesCount: number; completadas: number };
  const agg = new Map<string, AggEntry>();
  for (const ev of (evals ?? []) as any[]) {
    const entry = agg.get(ev.empleado_id) ?? { puntuacionesSum: 0, puntuacionesCount: 0, completadas: 0 };
    if (ev.estado === "completada" && typeof ev.puntuacion === "number") {
      entry.puntuacionesSum += ev.puntuacion;
      entry.puntuacionesCount += 1;
      entry.completadas += 1;
    }
    agg.set(ev.empleado_id, entry);
  }

  const resumen: EmpleadoResumen[] = [];
  for (const emp of empMap.values()) {
    const a = agg.get(emp.id);
    const completadas = a?.completadas ?? 0;
    const promedio10 = a && a.puntuacionesCount > 0 ? a.puntuacionesSum / a.puntuacionesCount : null;
    resumen.push({
      empleado_id: emp.id,
      nombre: emp.nombre,
      area_id: emp.area_id,
      area_nombre: emp.area_nombre,
      rol: emp.rol,
      completadas,
      promedio: promedio10 !== null ? score1_10A1_5(promedio10) : null,
      estado: completadas > 0 ? "completada" : "pendiente",
    });
  }

  const areas: AreaMini[] = (areasRaw ?? []).map((a) => ({ id: a.id, nombre: a.nombre }));

  // También parseamos las evaluaciones completadas para posible export con detalle
  const detalle = ((evals ?? []) as any[])
    .filter((e) => e.estado === "completada")
    .map((e) => {
      const dec = decodeComentario(e.comentario);
      const info = empMap.get(e.empleado_id);
      return {
        empleado_nombre: info?.nombre ?? "—",
        area_nombre:    info?.area_nombre ?? null,
        rol:            info?.rol ?? "",
        puntuacion:     e.puntuacion as number | null,
        criterios:      dec.criterios,
        texto:          dec.texto,
        created_at:     e.created_at as string,
      };
    });

  return (
    <EvaluacionesRrhhClient
      ciclo={ciclo}
      resumen={resumen}
      areas={areas}
      detalle={detalle}
    />
  );
}
