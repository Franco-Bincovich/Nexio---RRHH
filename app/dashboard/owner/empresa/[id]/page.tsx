import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  Users, CheckCircle2, Home, AlertCircle, Target, Thermometer,
  ArrowLeft, ChevronRight, Building2, UserSquare2, FlaskConical,
} from "lucide-react";
import ExpandSection from "../../dashboard/ExpandSection";
import { MOCK_IDS, MOCK_DETAIL } from "@/lib/owner-mock";

export default async function OwnerEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: empresaId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: owner } = await supabase
    .from("owners")
    .select("id, holding_nombre")
    .eq("user_id", user.id)
    .single();
  if (!owner) redirect("/login");

  const holdingNombre = owner.holding_nombre ?? "Mi holding";
  const hoy = new Date().toISOString().split("T")[0];

  // ── Datos mock ───────────────────────────────────────────
  if (MOCK_IDS.has(empresaId)) {
    const m = MOCK_DETAIL[empresaId];
    if (!m) notFound();
    return (
      <EmpresaView
        holdingNombre={holdingNombre}
        hoy={hoy}
        isMock
        empresaNombre={m.nombre}
        total={m.total}
        presentes={m.presentes}
        homeHoy={m.homeHoy}
        ausentes={m.ausentes}
        asistPct={m.asistPct}
        objPct={m.objPct}
        objPorArea={m.objPorArea}
        gerente={m.gerente}
        lideres={m.lideres}
        ausentesConArea={m.ausentesHoy}
        objPendientes={m.objPendientes}
      />
    );
  }

  // ── Datos reales ─────────────────────────────────────────
  const admin = createAdminClient();

  // Verify this empresa belongs to this owner
  const { data: ownerEmpresa } = await admin
    .from("owner_empresas")
    .select("empresa_id")
    .eq("owner_id", owner.id)
    .eq("empresa_id", empresaId)
    .single();
  if (!ownerEmpresa) notFound();

  const { data: empresa } = await admin
    .from("empresas")
    .select("id, nombre, plan")
    .eq("id", empresaId)
    .single();
  if (!empresa) notFound();

  // Empleados activos
  const { data: empleados } = await admin
    .from("empleados")
    .select("id, nombre, rol, area_id")
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  const empleadoIds = (empleados ?? []).map((e) => e.id);

  // Asistencia hoy
  const { data: registrosHoy } = await admin
    .from("registros_asistencia")
    .select("empleado_id, metodo")
    .in("empleado_id", empleadoIds.length > 0 ? empleadoIds : [""])
    .eq("fecha", hoy)
    .eq("tipo", "entrada");

  // Áreas
  const { data: areas } = await admin
    .from("areas")
    .select("id, nombre")
    .eq("empresa_id", empresaId);

  // Objetivos
  const { data: objetivos } = await admin
    .from("objetivos")
    .select("id, titulo, estado, area_id")
    .eq("empresa_id", empresaId);

  // ── KPIs ─────────────────────────────────────────────────
  const presentesSet = new Set((registrosHoy ?? []).map((r) => r.empleado_id));
  const total     = empleados?.length ?? 0;
  const presentes = presentesSet.size;
  const homeHoy   = (registrosHoy ?? []).filter((r) => r.metodo === "home").length;
  const ausentes  = total - presentes;
  const asistPct  = total > 0 ? Math.round((presentes / total) * 100) : 0;

  const objTotal       = (objetivos ?? []).length;
  const objCompletados = (objetivos ?? []).filter((o) => o.estado === "completado").length;
  const objPct         = objTotal > 0 ? Math.round((objCompletados / objTotal) * 100) : 0;

  const objPorArea = (areas ?? []).map((area) => {
    const areaObj     = (objetivos ?? []).filter((o) => o.area_id === area.id);
    const aTotal      = areaObj.length;
    const completados = areaObj.filter((o) => o.estado === "completado").length;
    const pct         = aTotal > 0 ? Math.round((completados / aTotal) * 100) : null;
    return { id: area.id, nombre: area.nombre, total: aTotal, completados, pct: pct ?? 0 };
  }).filter((a) => a.total > 0);

  const gerente = (empleados ?? []).find((e) => e.rol === "gerente") ?? null;
  const lideres = (empleados ?? []).filter((e) => e.rol === "lider");
  const lideresConArea = lideres.map((l) => {
    const area = (areas ?? []).find((a) => a.id === l.area_id);
    const empCount = (empleados ?? []).filter((e) => e.area_id === l.area_id && e.rol !== "lider").length;
    return { id: l.id, nombre: l.nombre, areaNombre: area?.nombre ?? "Sin área", empCount };
  });

  const ausentesHoy = (empleados ?? []).filter((e) => !presentesSet.has(e.id));
  const ausentesConArea = ausentesHoy.map((e) => {
    const area = (areas ?? []).find((a) => a.id === e.area_id);
    return { id: e.id, nombre: e.nombre, areaNombre: area?.nombre ?? "—" };
  });

  const objPendientes = (objetivos ?? []).filter((o) => o.estado === "pendiente").length;

  return (
    <EmpresaView
      holdingNombre={holdingNombre}
      hoy={hoy}
      isMock={false}
      empresaNombre={empresa.nombre}
      total={total}
      presentes={presentes}
      homeHoy={homeHoy}
      ausentes={ausentes}
      asistPct={asistPct}
      objPct={objPct}
      objPorArea={objPorArea}
      gerente={gerente ? { nombre: gerente.nombre } : null}
      lideres={lideresConArea}
      ausentesConArea={ausentesConArea}
      objPendientes={objPendientes}
    />
  );
}

function EmpresaView({
  holdingNombre, hoy, isMock, empresaNombre,
  total, presentes, homeHoy, ausentes, asistPct,
  objPct, objPorArea, gerente, lideres, ausentesConArea, objPendientes,
}: {
  holdingNombre: string; hoy: string; isMock: boolean; empresaNombre: string;
  total: number; presentes: number; homeHoy: number; ausentes: number; asistPct: number;
  objPct: number;
  objPorArea: { id: string; nombre: string; completados: number; total: number; pct: number }[];
  gerente: { nombre: string } | null;
  lideres: { id: string; nombre: string; areaNombre: string; empCount: number }[];
  ausentesConArea: { id: string; nombre: string; areaNombre: string }[];
  objPendientes: number;
}) {
  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/owner/dashboard"
          className="flex items-center gap-1.5 text-xs text-secondary hover:text-accent transition-colors w-fit mb-4"
        >
          <ArrowLeft size={13} />
          {holdingNombre}
        </Link>
        <p className="text-[10px] uppercase tracking-[0.9px] text-secondary/60 mb-1">Empresa</p>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{empresaNombre}</h1>
          {isMock && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
              <FlaskConical size={10} />
              Datos ilustrativos
            </span>
          )}
        </div>
        <p className="text-secondary text-sm">{formatFecha(hoy)}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Empleados activos" value={total}    icon={Users}        color="text-accent" />
        <StatCard label="Presentes hoy"     value={presentes} icon={CheckCircle2} color="text-green-400"
          sub={total > 0 ? `${asistPct}%` : undefined} />
        <StatCard label="Home office hoy"   value={homeHoy}   icon={Home}         color="text-blue-400" />
        <StatCard label="Ausentes hoy"      value={ausentes}  icon={AlertCircle}  color="text-red-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Columna izquierda */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="border-b border-[#1A2235]">
              <ExpandSection
                title={<span className="flex items-center gap-2"><Target size={15} className="text-accent" />Objetivos</span>}
                badge={
                  objPct > 0 ? (
                    <span className={`text-[10px] font-bold ${objPct >= 70 ? "text-accent" : objPct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                      {objPct}%
                    </span>
                  ) : null
                }
                defaultOpen
              >
                {objPorArea.length === 0 ? (
                  <p className="text-xs text-secondary">Sin objetivos registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {objPorArea.map((area) => (
                      <div key={area.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-secondary truncate max-w-[200px]">{area.nombre}</span>
                          <span className="font-medium">{area.pct}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-accent opacity-70" style={{ width: `${area.pct}%` }} />
                        </div>
                        <p className="text-[10px] text-secondary/50 mt-0.5">{area.completados}/{area.total} completados</p>
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

          {/* Organigrama */}
          <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
            <ExpandSection
              title={<span className="flex items-center gap-2"><Building2 size={15} className="text-accent" />Organigrama</span>}
              defaultOpen
            >
              {!gerente && lideres.length === 0 ? (
                <p className="text-xs text-secondary">Sin datos de organigrama.</p>
              ) : (
                <div className="space-y-3">
                  {gerente && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-[#1A2235]">
                      <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center flex-shrink-0">
                        <UserSquare2 size={14} className="text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{gerente.nombre}</p>
                        <p className="text-[10px] uppercase tracking-[0.7px] text-accent">Gerente General</p>
                      </div>
                    </div>
                  )}
                  {lideres.length > 0 && (
                    <div className="pl-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <ChevronRight size={12} className="text-secondary/50" />
                        <span className="text-[10px] uppercase tracking-[0.7px] text-secondary/50">Líderes de área</span>
                      </div>
                      {lideres.map((lider) => (
                        <div key={lider.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-[#1A2235]">
                          <div className="w-7 h-7 rounded-full bg-white/5 border border-[#1A2235] flex items-center justify-center flex-shrink-0">
                            <UserSquare2 size={12} className="text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{lider.nombre}</p>
                            <p className="text-[10px] text-secondary/60 truncate">{lider.areaNombre}</p>
                          </div>
                          <span className="text-[10px] text-secondary/50 flex-shrink-0">{lider.empCount} empl.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ExpandSection>
          </div>
        </div>

        {/* Columna derecha: Alertas */}
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
              <AlertCircle size={15} className="text-red-400" />
              <h2 className="text-sm font-semibold">Alertas</h2>
              {(ausentes > 0 || objPendientes > 0) && (
                <span className="ml-auto text-[10px] font-bold text-red-400">
                  {ausentes + objPendientes}
                </span>
              )}
            </div>

            <div className="px-5 py-4 space-y-4">
              {ausentes === 0 && objPendientes === 0 ? (
                <p className="text-xs text-secondary/60">Sin alertas activas.</p>
              ) : (
                <>
                  {ausentes > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/50 mb-2">Ausencias hoy</p>
                      <div className="space-y-1.5">
                        {ausentesConArea.slice(0, 8).map((emp) => (
                          <div key={emp.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium truncate">{emp.nombre}</span>
                            <span className="text-[10px] text-secondary/60 truncate flex-shrink-0">{emp.areaNombre}</span>
                          </div>
                        ))}
                        {ausentesConArea.length > 8 && (
                          <p className="text-[10px] text-secondary/50">+{ausentesConArea.length - 8} más</p>
                        )}
                      </div>
                    </div>
                  )}
                  {objPendientes > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/50 mb-2">Objetivos pendientes</p>
                      <p className="text-xs">
                        <span className="font-bold text-yellow-400">{objPendientes}</span>
                        <span className="text-secondary"> objetivo{objPendientes !== 1 ? "s" : ""} sin iniciar</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
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
