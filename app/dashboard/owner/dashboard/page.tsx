import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  Users, CheckCircle2, Home, AlertCircle, Target, Thermometer,
  ArrowRight, Building2, FlaskConical,
} from "lucide-react";
import ExpandSection from "./ExpandSection";
import { MOCK_EMPRESAS, MOCK_STATS } from "@/lib/owner-mock";

export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: owner } = await supabase
    .from("owners")
    .select("id, holding_nombre")
    .eq("user_id", user.id)
    .single();
  if (!owner) redirect("/login");

  // Usar admin client para bypassear RLS
  const admin = createAdminClient();

  const { data: ownerEmpresas } = await admin
    .from("owner_empresas")
    .select("empresa_id")
    .eq("owner_id", owner.id);
  const empresaIds = (ownerEmpresas ?? []).map((oe) => oe.empresa_id);

  const { data: empresasReal } = await admin
    .from("empresas")
    .select("id, nombre, plan")
    .in("id", empresaIds.length > 0 ? empresaIds : [""])
    .order("nombre");

  const usandoMock = !empresasReal || empresasReal.length === 0;

  // ── Datos mock ───────────────────────────────────────────
  let statsPerEmpresa: typeof MOCK_STATS;
  if (usandoMock) {
    statsPerEmpresa = MOCK_STATS.map((e) => ({ ...e }));
  } else {
    const hoy = new Date().toISOString().split("T")[0];

    const { data: empleados } = await admin
      .from("empleados")
      .select("id, empresa_id")
      .in("empresa_id", empresaIds)
      .eq("activo", true);

    const empleadoIds = (empleados ?? []).map((e) => e.id);

    const { data: registrosHoy } = await admin
      .from("registros_asistencia")
      .select("empleado_id, metodo")
      .in("empleado_id", empleadoIds.length > 0 ? empleadoIds : [""])
      .eq("fecha", hoy)
      .eq("tipo", "entrada");

    const { data: objetivos } = await admin
      .from("objetivos")
      .select("empresa_id, estado")
      .in("empresa_id", empresaIds);

    const presentesSet = new Set((registrosHoy ?? []).map((r) => r.empleado_id));

    statsPerEmpresa = (empresasReal).map((emp) => {
      const empEmpleados   = (empleados ?? []).filter((e) => e.empresa_id === emp.id);
      const empIds         = new Set(empEmpleados.map((e) => e.id));
      const presentes      = (registrosHoy ?? []).filter((r) => empIds.has(r.empleado_id)).length;
      const homeHoy        = (registrosHoy ?? []).filter((r) => empIds.has(r.empleado_id) && r.metodo === "home").length;
      const total          = empEmpleados.length;
      const ausentes       = total - presentes;
      const asistPct       = total > 0 ? Math.round((presentes / total) * 100) : 0;
      const empObj         = (objetivos ?? []).filter((o) => o.empresa_id === emp.id);
      const objTotal       = empObj.length;
      const objCompletados = empObj.filter((o) => o.estado === "completado").length;
      const objPct         = objTotal > 0 ? Math.round((objCompletados / objTotal) * 100) : null;
      return { ...emp, total, presentes, homeHoy, ausentes, asistPct, objTotal, objPct: objPct ?? 0, alertas: ausentes };
    });
  }

  // ── KPIs globales ────────────────────────────────────────
  const gTotal     = statsPerEmpresa.reduce((a, e) => a + e.total, 0);
  const gPresentes = statsPerEmpresa.reduce((a, e) => a + e.presentes, 0);
  const gHome      = statsPerEmpresa.reduce((a, e) => a + e.homeHoy, 0);
  const gAlertas   = statsPerEmpresa.reduce((a, e) => a + e.alertas, 0);

  // ── Objetivos global avg ─────────────────────────────────
  const objConDatos = statsPerEmpresa.filter((e) => e.objPct !== null);
  const objAvgPct   = objConDatos.length > 0
    ? Math.round(objConDatos.reduce((a, e) => a + (e.objPct ?? 0), 0) / objConDatos.length)
    : null;

  const holdingNombre = owner.holding_nombre ?? "Mi holding";

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.9px] text-secondary/60 mb-1">Consolidado</p>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{holdingNombre}</h1>
          {usandoMock && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
              <FlaskConical size={10} />
              Datos ilustrativos
            </span>
          )}
        </div>
        <p className="text-secondary text-sm">
          {statsPerEmpresa.length} empresa{statsPerEmpresa.length !== 1 ? "s" : ""} · {formatFecha(new Date().toISOString().split("T")[0])}
        </p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Empleados activos" value={gTotal}    icon={Users}         color="text-accent" />
        <StatCard label="Presentes hoy"     value={gPresentes}icon={CheckCircle2}  color="text-green-400"
          sub={gTotal > 0 ? `${Math.round(gPresentes / gTotal * 100)}%` : undefined} />
        <StatCard label="Home office hoy"   value={gHome}     icon={Home}          color="text-blue-400" />
        <StatCard label="Ausentes hoy"      value={gAlertas}  icon={AlertCircle}   color="text-red-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Tabla empresas */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Building2 size={15} className="text-accent" />
            <h2 className="text-sm font-semibold">Resumen por empresa</h2>
          </div>

          {statsPerEmpresa.length === 0 ? (
            <p className="px-5 py-8 text-sm text-secondary">No hay empresas vinculadas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                  <th className="text-left px-5 py-2.5 font-medium">Empresa</th>
                  <th className="text-right px-5 py-2.5 font-medium">Empl.</th>
                  <th className="text-right px-5 py-2.5 font-medium">Asistencia</th>
                  <th className="text-right px-5 py-2.5 font-medium">Objetivos</th>
                  <th className="text-right px-5 py-2.5 font-medium">Alertas</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {statsPerEmpresa.map((emp) => (
                  <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-border/20 transition-colors">
                    <td className="px-5 py-3 font-medium">{emp.nombre}</td>
                    <td className="px-5 py-3 text-right text-secondary">{emp.total}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${emp.asistPct}%`, opacity: 0.8 }} />
                        </div>
                        <span className={`text-xs font-medium ${emp.asistPct >= 80 ? "text-accent" : emp.asistPct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {emp.asistPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {emp.objPct !== null ? (
                        <span className={`text-xs font-medium ${emp.objPct >= 70 ? "text-accent" : emp.objPct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                          {emp.objPct}%
                        </span>
                      ) : (
                        <span className="text-xs text-secondary/50">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {emp.alertas > 0 ? (
                        <span className="text-xs text-red-400 font-medium">{emp.alertas}</span>
                      ) : (
                        <span className="text-xs text-accent">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/owner/empresa/${emp.id}`}
                        className="flex items-center justify-end gap-1 text-xs text-secondary hover:text-accent transition-colors"
                      >
                        Ver
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Objetivos global */}
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="border-b border-border">
            <ExpandSection
              title={<span className="flex items-center gap-2"><Target size={15} className="text-accent" />Objetivos</span>}
              badge={
                objAvgPct !== null ? (
                  <span className={`text-[10px] font-bold ${objAvgPct >= 70 ? "text-accent" : objAvgPct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {objAvgPct}% avg
                  </span>
                ) : null
              }
              defaultOpen
            >
              {objConDatos.length === 0 ? (
                <p className="text-xs text-secondary">Sin objetivos registrados.</p>
              ) : (
                <div className="space-y-3">
                  {statsPerEmpresa.map((emp) => (
                    <div key={emp.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-secondary truncate max-w-[130px]">{emp.nombre}</span>
                        <span className="font-medium">{emp.objPct !== null ? `${emp.objPct}%` : "—"}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-accent opacity-70" style={{ width: `${emp.objPct ?? 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandSection>
          </div>

          <ExpandSection
            title={<span className="flex items-center gap-2"><Thermometer size={15} className="text-secondary" />Temperatura</span>}
            badge={<span className="text-[10px] text-secondary/50 uppercase tracking-[0.6px]">Próximamente</span>}
          >
            <p className="text-xs text-secondary/60 italic">
              El módulo de temperatura estará disponible en la próxima versión.
            </p>
          </ExpandSection>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: {
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

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
}
