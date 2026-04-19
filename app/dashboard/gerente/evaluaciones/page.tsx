/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCicloConfig, score1_10A1_5 } from "@/lib/evaluaciones";
import { Building2, CheckCircle2, Clock, Star, AlertCircle, Power } from "lucide-react";
import { PageHeader } from "@/components/ui";

export default async function GerenteEvaluacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();
  if (!gerente) redirect("/login");

  const admin = createAdminClient();
  const ciclo = await getCicloConfig(admin, gerente.empresa_id);

  const { data: empleados } = await admin
    .from("empleados")
    .select("id, area_id, areas!empleados_area_id_fkey(nombre)")
    .eq("empresa_id", gerente.empresa_id)
    .eq("activo", true);

  type EmpInfo = { id: string; area_id: string | null; area_nombre: string | null };
  const empMap = new Map<string, EmpInfo>();
  for (const e of (empleados ?? [])) {
    const areas = e.areas as { nombre: string } | { nombre: string }[] | null;
    const area_nombre = Array.isArray(areas) ? areas[0]?.nombre ?? null : areas?.nombre ?? null;
    empMap.set(e.id, { id: e.id, area_id: e.area_id ?? null, area_nombre });
  }

  // Evaluaciones del ciclo (si hay fecha de activación, filtra desde ahí)
  let q = (admin as any)
    .from("evaluaciones")
    .select("id, empleado_id, puntuacion, estado, created_at")
    .eq("empresa_id", gerente.empresa_id)
    .eq("tipo", "desempeño");
  if (ciclo.evaluaciones_activas_desde) {
    q = q.gte("created_at", ciclo.evaluaciones_activas_desde);
  }
  const { data: evals } = await q;

  // Agrupar por área
  type AreaAgg = {
    nombre: string;
    empleadosTotal: number;
    empleadosConEval: Set<string>;
    puntuacionSum: number;
    puntuacionCount: number;
  };
  const areaMap = new Map<string, AreaAgg>();
  const SIN_AREA = "__sin_area__";

  for (const e of empMap.values()) {
    const key = e.area_id ?? SIN_AREA;
    const nombre = e.area_nombre ?? "Sin área";
    if (!areaMap.has(key)) {
      areaMap.set(key, { nombre, empleadosTotal: 0, empleadosConEval: new Set(), puntuacionSum: 0, puntuacionCount: 0 });
    }
    areaMap.get(key)!.empleadosTotal += 1;
  }

  for (const ev of ((evals ?? []) as any[])) {
    const info = empMap.get(ev.empleado_id);
    if (!info) continue;
    const key = info.area_id ?? SIN_AREA;
    const entry = areaMap.get(key);
    if (!entry) continue;
    if (ev.estado === "completada") {
      entry.empleadosConEval.add(ev.empleado_id);
      if (typeof ev.puntuacion === "number") {
        entry.puntuacionSum += ev.puntuacion;
        entry.puntuacionCount += 1;
      }
    }
  }

  const areasRows = Array.from(areaMap.values())
    .map((a) => ({
      nombre: a.nombre,
      empleadosTotal: a.empleadosTotal,
      completadas: a.empleadosConEval.size,
      pendientes: a.empleadosTotal - a.empleadosConEval.size,
      promedio: a.puntuacionCount > 0 ? score1_10A1_5(a.puntuacionSum / a.puntuacionCount) : null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const totalEmpleados = areasRows.reduce((s, a) => s + a.empleadosTotal, 0);
  const totalCompletadas = areasRows.reduce((s, a) => s + a.completadas, 0);
  const totalPendientes = totalEmpleados - totalCompletadas;
  const promGeneral = areasRows.filter((a) => a.promedio !== null).reduce((s, a) => s + (a.promedio ?? 0), 0);
  const promCount = areasRows.filter((a) => a.promedio !== null).length;
  const promGeneralAvg = promCount > 0 ? (promGeneral / promCount).toFixed(2) : "—";

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-6">
      <PageHeader
        titulo="Evaluaciones"
        descripcion="Vista consolidada por área"
        className="mb-0"
      />

      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
        <Power size={14} className={ciclo.evaluaciones_activas ? "text-accent" : "text-secondary/60"} />
        <p className="text-sm">
          {ciclo.evaluaciones_activas
            ? <>Ciclo <span className="text-accent font-semibold">activo</span>{ciclo.evaluaciones_activas_desde ? ` desde ${new Date(ciclo.evaluaciones_activas_desde).toLocaleDateString("es-AR")}` : ""}</>
            : <>Ciclo <span className="text-yellow-400 font-semibold">cerrado</span> (RRHH controla la apertura)</>}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Kpi icon={<CheckCircle2 size={13} className="text-accent" />}  label="Completadas" value={totalCompletadas} color="text-accent" />
        <Kpi icon={<Clock size={13} className="text-yellow-400" />}     label="Pendientes"  value={totalPendientes}  color="text-yellow-400" />
        <Kpi icon={<Star size={13} className="text-blue-400" />}        label="Promedio"    value={promGeneralAvg}   color="text-blue-400" />
      </div>

      {areasRows.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border shadow-sm py-12 text-center">
          <AlertCircle size={24} className="text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-secondary/60">No hay áreas registradas.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Building2 size={15} className="text-accent" />
            <h2 className="text-sm font-semibold">Resultados por área</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                <th className="text-left px-5 py-2.5 font-medium">Área</th>
                <th className="text-right px-5 py-2.5 font-medium">Empleados</th>
                <th className="text-right px-5 py-2.5 font-medium">Completadas</th>
                <th className="text-right px-5 py-2.5 font-medium">Pendientes</th>
                <th className="text-right px-5 py-2.5 font-medium">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {areasRows.map((a) => (
                <tr key={a.nombre} className="border-b border-border last:border-0 hover:bg-border/20 transition-colors">
                  <td className="px-5 py-3 text-xs font-medium">{a.nombre}</td>
                  <td className="px-5 py-3 text-xs text-right">{a.empleadosTotal}</td>
                  <td className="px-5 py-3 text-xs text-right text-accent">{a.completadas}</td>
                  <td className="px-5 py-3 text-xs text-right text-yellow-400">{a.pendientes}</td>
                  <td className="px-5 py-3 text-xs text-right font-semibold">
                    {a.promedio !== null ? a.promedio.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">{label}</p>
      </div>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
