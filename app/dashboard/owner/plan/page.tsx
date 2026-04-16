import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  CreditCard, Building2, Users, CheckCircle2, Mail, Calendar,
} from "lucide-react";

const PRECIO_POR_EMPLEADO = 3; // USD
const EMPLEADOS_CONTRATADOS = 500;
const EMPRESAS_CONTRATADAS = 3;

export default async function OwnerPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: owner } = await supabase
    .from("owners")
    .select("id, holding_nombre")
    .eq("user_id", user.id)
    .single();
  if (!owner) redirect("/login");

  const { data: ownerEmpresas } = await supabase
    .from("owner_empresas")
    .select("empresa_id")
    .eq("owner_id", owner.id);
  const empresaIds = (ownerEmpresas ?? []).map((oe) => oe.empresa_id);

  const { count: empleadosActivos } = await supabase
    .from("empleados")
    .select("*", { count: "exact", head: true })
    .in("empresa_id", empresaIds.length > 0 ? empresaIds : [""])
    .eq("activo", true);

  const activos = empleadosActivos ?? 0;
  const totalMensual = activos * PRECIO_POR_EMPLEADO;

  // Próxima factura: día 1 del próximo mes
  const ahora = new Date();
  const proximaFactura = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
  const proximaFacturaStr = proximaFactura.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.9px] text-secondary/60 mb-1">Cuenta</p>
        <h1 className="text-2xl font-bold mb-1">Mi plan</h1>
        <p className="text-secondary text-sm">{owner.holding_nombre ?? "Mi holding"}</p>
      </div>

      {/* Plan activo badge */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <CreditCard size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold">Plan Business</p>
              <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">Facturación mensual</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={10} />
            Activo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-0.5">Precio por empleado</p>
            <p className="text-sm font-semibold">USD {PRECIO_POR_EMPLEADO} / mes</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-0.5">Empleados contratados</p>
            <p className="text-sm font-semibold">{EMPLEADOS_CONTRATADOS.toLocaleString("es-AR")}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={14} className="text-accent" />
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">Empresas</p>
          </div>
          <p className="text-[22px] font-extrabold text-accent">{empresaIds.length}</p>
          <p className="text-[10px] text-secondary/50 mt-1">de {EMPRESAS_CONTRATADAS} contratadas</p>
        </div>

        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-accent" />
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">Empleados activos</p>
          </div>
          <p className="text-[22px] font-extrabold text-accent">{activos}</p>
          <p className="text-[10px] text-secondary/50 mt-1">de {EMPLEADOS_CONTRATADOS.toLocaleString("es-AR")} contratados</p>
        </div>
      </div>

      {/* Facturación */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
          <Calendar size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Próxima factura</h2>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">Empleados activos × USD {PRECIO_POR_EMPLEADO}</span>
            <span className="text-sm font-medium">USD {totalMensual.toLocaleString("es-AR")}</span>
          </div>
          <div className="h-px bg-[#1A2235]" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total estimado</span>
            <span className="text-lg font-extrabold text-accent">USD {totalMensual.toLocaleString("es-AR")}</span>
          </div>
          <p className="text-[11px] text-secondary/50">
            Fecha de facturación estimada: <span className="text-secondary">{proximaFacturaStr}</span>
          </p>
        </div>
      </div>

      {/* Soporte */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Mail size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Soporte</h2>
        </div>
        <p className="text-xs text-secondary mb-2">
          Para cambios de plan, facturación o soporte técnico contactanos por email.
        </p>
        <p className="text-xs font-medium text-accent">soporte@nexio.app</p>
      </div>
    </div>
  );
}
