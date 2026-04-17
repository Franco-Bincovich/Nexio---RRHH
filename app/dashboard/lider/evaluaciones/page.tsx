/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getLiderScope } from "@/lib/lider-scope";
import { getCicloConfig, score1_10A1_5 } from "@/lib/evaluaciones";
import { AlertCircle } from "lucide-react";
import EvaluacionesLiderClient, { type EmpleadoEvalRow } from "./EvaluacionesLiderClient";

export default async function LiderEvaluacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getLiderScope(user.id);
  if (!scope) redirect("/login");

  const admin = createAdminClient();
  const ciclo = await getCicloConfig(admin, scope.empresa_id);

  if (!ciclo.evaluaciones_activas) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Evaluaciones</h1>
        <p className="text-secondary text-sm mb-6">Evaluación de desempeño del equipo</p>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-4">
          <AlertCircle size={16} />
          <p className="text-sm">No hay período de evaluación activo actualmente.</p>
        </div>
      </div>
    );
  }

  // Empleados visibles: área propia, o empresa si demo
  const scopeFilter: { col: "empresa_id" | "area_id"; val: string } | null = scope.es_demo
    ? { col: "empresa_id", val: scope.empresa_id }
    : scope.area_id
      ? { col: "area_id", val: scope.area_id }
      : null;

  if (!scopeFilter) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Evaluaciones</h1>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          No tenés un área asignada.
        </div>
      </div>
    );
  }

  const { data: empleados } = await admin
    .from("empleados")
    .select("id, nombre")
    .eq("activo", true)
    .eq(scopeFilter.col, scopeFilter.val)
    .neq("id", scope.id)
    .order("nombre");

  const ids = (empleados ?? []).map((e) => e.id);

  // Evaluaciones del ciclo actual del líder hacia esos empleados
  let evals: any[] = [];
  if (ids.length > 0) {
    let q = (admin as any)
      .from("evaluaciones")
      .select("id, empleado_id, puntuacion, estado, created_at")
      .eq("empresa_id", scope.empresa_id)
      .eq("evaluador_id", scope.id)
      .eq("tipo", "desempeño")
      .in("empleado_id", ids);
    if (ciclo.evaluaciones_activas_desde) {
      q = q.gte("created_at", ciclo.evaluaciones_activas_desde);
    }
    const res = await q;
    evals = (res.data ?? []) as any[];
  }

  const evalByEmpleado = new Map<string, any>();
  for (const ev of evals) {
    const prev = evalByEmpleado.get(ev.empleado_id);
    if (!prev || new Date(ev.created_at) > new Date(prev.created_at)) {
      evalByEmpleado.set(ev.empleado_id, ev);
    }
  }

  const rows: EmpleadoEvalRow[] = (empleados ?? []).map((e) => {
    const ev = evalByEmpleado.get(e.id);
    return {
      empleado_id: e.id,
      nombre: e.nombre,
      estado: ev?.estado === "completada" ? "completada" : "pendiente",
      promedio: ev?.puntuacion != null ? score1_10A1_5(ev.puntuacion) : null,
      fecha: ev?.created_at ?? null,
    };
  });

  return (
    <EvaluacionesLiderClient
      empleados={rows}
      areaNombre={scope.area_nombre}
      cicloDesde={ciclo.evaluaciones_activas_desde}
    />
  );
}
