import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Building2, Users, UserCheck } from "lucide-react";

export default async function AreasPage() {
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
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Áreas</h1>
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar la información de la empresa.
        </div>
      </div>
    );
  }

  const empresaId = gerente.empresa_id;

  const { data: areas } = await supabase
    .from("areas")
    .select("id, nombre, lider_id")
    .eq("empresa_id", empresaId)
    .order("nombre");

  const liderIds = (areas ?? []).map((a) => a.lider_id).filter(Boolean) as string[];
  const { data: lideres } = await supabase
    .from("empleados")
    .select("id, nombre, email")
    .in("id", liderIds.length > 0 ? liderIds : [""]);
  const liderMap = Object.fromEntries((lideres ?? []).map((l) => [l.id, l]));

  // Count de empleados activos por área
  const { data: empleados } = await supabase
    .from("empleados")
    .select("area_id")
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  const countPerArea: Record<string, number> = {};
  for (const e of empleados ?? []) {
    if (e.area_id) countPerArea[e.area_id] = (countPerArea[e.area_id] ?? 0) + 1;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Áreas</h1>
        <p className="text-secondary text-sm">
          {areas?.length ?? 0} área{(areas?.length ?? 0) !== 1 ? "s" : ""} registrada{(areas?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      {!areas || areas.length === 0 ? (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] py-16 text-center">
          <Building2 size={32} className="text-secondary mx-auto mb-3" />
          <p className="text-secondary text-sm">No hay áreas registradas todavía.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => {
            const lider = area.lider_id ? liderMap[area.lider_id] : null;
            const totalEmpleados = countPerArea[area.id] ?? 0;
            const initials = lider?.nombre
              ? lider.nombre.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
              : null;

            return (
              <div
                key={area.id}
                className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Building2 size={18} className="text-accent" />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-secondary">
                    <Users size={12} />
                    {totalEmpleados} activo{totalEmpleados !== 1 ? "s" : ""}
                  </span>
                </div>

                <h3 className="font-bold text-base mb-3">{area.nombre}</h3>

                {/* Líder */}
                <div className="border-t border-[#1A2235] pt-3">
                  {lider ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-[10px] font-semibold text-accent flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{lider.nombre}</p>
                        <p className="text-[10px] text-secondary truncate">{lider.email}</p>
                      </div>
                      <UserCheck size={13} className="text-accent ml-auto flex-shrink-0" />
                    </div>
                  ) : (
                    <p className="text-xs text-secondary/60 italic">Sin líder asignado</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
