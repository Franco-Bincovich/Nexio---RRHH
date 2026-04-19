import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  Users, CheckCircle2, Home, AlertCircle, Building2, Target,
} from "lucide-react";

export default async function GerenteDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!gerente?.empresa_id) {
    return (
      <div className="p-4 md:p-8 max-w-6xl">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar la información de la empresa.
        </div>
      </div>
    );
  }

  const empresaId = gerente.empresa_id;
  const hoy = new Date().toISOString().split("T")[0];

  // Todos los empleados activos
  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, area_id")
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  const empleadoIds = (empleados ?? []).map((e) => e.id);
  const totalActivos = empleadoIds.length;

  // Asistencia de hoy
  const { data: registrosHoy } = await supabase
    .from("registros_asistencia")
    .select("empleado_id, metodo")
    .in("empleado_id", empleadoIds.length > 0 ? empleadoIds : [""])
    .eq("fecha", hoy)
    .eq("tipo", "entrada");

  const presentesSet = new Set((registrosHoy ?? []).map((r) => r.empleado_id));
  const presentesHoy = presentesSet.size;
  const homeHoy = new Set(
    (registrosHoy ?? []).filter((r) => r.metodo === "home").map((r) => r.empleado_id)
  ).size;
  const ausentes = totalActivos - presentesHoy;

  // Count empleados por área
  const countPerArea: Record<string, number> = {};
  const presentesPorArea: Record<string, number> = {};
  for (const emp of empleados ?? []) {
    if (!emp.area_id) continue;
    countPerArea[emp.area_id] = (countPerArea[emp.area_id] ?? 0) + 1;
    if (presentesSet.has(emp.id)) {
      presentesPorArea[emp.area_id] = (presentesPorArea[emp.area_id] ?? 0) + 1;
    }
  }

  // Áreas
  const { data: areas } = await supabase
    .from("areas")
    .select("id, nombre, lider_id")
    .eq("empresa_id", empresaId)
    .order("nombre");

  const liderIds = (areas ?? []).map((a) => a.lider_id).filter(Boolean) as string[];
  const { data: lideres } = await supabase
    .from("empleados")
    .select("id, nombre")
    .in("id", liderIds.length > 0 ? liderIds : [""]);
  const liderMap = Object.fromEntries((lideres ?? []).map((l) => [l.id, l.nombre]));

  // Objetivos
  const { data: objetivos } = await supabase
    .from("objetivos")
    .select("estado")
    .eq("empresa_id", empresaId);

  const objPendientes  = (objetivos ?? []).filter((o) => o.estado === "pendiente").length;
  const objEnProgreso  = (objetivos ?? []).filter((o) => o.estado === "en_progreso").length;
  const objCompletados = (objetivos ?? []).filter((o) => o.estado === "completado").length;
  const totalObjetivos = objPendientes + objEnProgreso + objCompletados;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-secondary text-sm">
          Resumen general · {formatFecha(hoy)}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Empleados activos"
          value={totalActivos}
          icon={Users}
          color="text-accent"
        />
        <StatCard
          label="Presentes hoy"
          value={presentesHoy}
          icon={CheckCircle2}
          color="text-green-400"
          sub={totalActivos > 0 ? `${Math.round(presentesHoy / totalActivos * 100)}%` : "—"}
        />
        <StatCard
          label="Home office hoy"
          value={homeHoy}
          icon={Home}
          color="text-blue-400"
        />
        <StatCard
          label="Ausentes hoy"
          value={ausentes}
          icon={AlertCircle}
          color="text-red-400"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tabla de áreas */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Building2 size={15} className="text-accent" />
            <h2 className="text-sm font-semibold">Áreas de la empresa</h2>
            <span className="ml-auto text-[10px] text-secondary uppercase tracking-[0.7px]">
              {areas?.length ?? 0} áreas
            </span>
          </div>

          {!areas || areas.length === 0 ? (
            <p className="px-5 py-8 text-sm text-secondary">No hay áreas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-secondary text-[10px] uppercase tracking-[0.7px] border-b border-border">
                  <th className="text-left px-5 py-2.5 font-medium">Área</th>
                  <th className="text-left px-5 py-2.5 font-medium">Líder</th>
                  <th className="text-right px-5 py-2.5 font-medium">Empleados</th>
                  <th className="text-right px-5 py-2.5 font-medium">Asistencia hoy</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => {
                  const total     = countPerArea[area.id] ?? 0;
                  const presentes = presentesPorArea[area.id] ?? 0;
                  const pct       = total > 0 ? Math.round(presentes / total * 100) : 0;
                  return (
                    <tr
                      key={area.id}
                      className="border-b border-border last:border-0 hover:bg-border/20 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium">{area.nombre}</td>
                      <td className="px-5 py-3 text-secondary">
                        {area.lider_id ? liderMap[area.lider_id] ?? "—" : "Sin líder"}
                      </td>
                      <td className="px-5 py-3 text-right text-secondary">{total}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${pct}%`, opacity: pct === 100 ? 1 : 0.7 }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${pct >= 80 ? "text-accent" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Objetivos globales */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <Target size={15} className="text-accent" />
            <h2 className="text-sm font-semibold">Objetivos globales</h2>
          </div>

          {totalObjetivos === 0 ? (
            <p className="text-sm text-secondary">No hay objetivos registrados todavía.</p>
          ) : (
            <div className="space-y-4">
              <ObjStatRow
                label="Pendientes"
                value={objPendientes}
                total={totalObjetivos}
                color="bg-yellow-400"
                textColor="text-yellow-400"
              />
              <ObjStatRow
                label="En progreso"
                value={objEnProgreso}
                total={totalObjetivos}
                color="bg-blue-400"
                textColor="text-blue-400"
              />
              <ObjStatRow
                label="Completados"
                value={objCompletados}
                total={totalObjetivos}
                color="bg-accent"
                textColor="text-accent"
              />

              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary uppercase tracking-[0.7px] text-[10px]">Total</span>
                  <span className="font-semibold">{totalObjetivos}</span>
                </div>
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden flex">
                  {objCompletados > 0 && (
                    <div className="h-full bg-accent" style={{ width: `${Math.round(objCompletados / totalObjetivos * 100)}%` }} />
                  )}
                  {objEnProgreso > 0 && (
                    <div className="h-full bg-blue-400 opacity-70" style={{ width: `${Math.round(objEnProgreso / totalObjetivos * 100)}%` }} />
                  )}
                  {objPendientes > 0 && (
                    <div className="h-full bg-yellow-400 opacity-50" style={{ width: `${Math.round(objPendientes / totalObjetivos * 100)}%` }} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">{label}</p>
      </div>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] uppercase tracking-[0.7px] text-secondary mt-1">{sub}</p>}
    </div>
  );
}

function ObjStatRow({
  label, value, total, color, textColor,
}: {
  label: string; value: number; total: number; color: string; textColor: string;
}) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-secondary">{label}</span>
        <span className={`font-semibold ${textColor}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} opacity-70`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
}
