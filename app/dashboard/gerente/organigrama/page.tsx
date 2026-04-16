import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { Network } from "lucide-react";

export default async function OrganigramaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("id, nombre, empresa_id, empresas!empleados_empresa_id_fkey(nombre)")
    .eq("user_id", user.id)
    .single();

  if (!gerente) redirect("/login");

  const admin = createAdminClient();
  const empresaData = gerente.empresas as { nombre: string } | null;

  const [{ data: areas }, { data: empleados }] = await Promise.all([
    admin.from("areas").select("id, nombre").eq("empresa_id", gerente.empresa_id),
    admin.from("empleados")
      .select("id, nombre, rol, area_id, activo")
      .eq("empresa_id", gerente.empresa_id)
      .eq("activo", true),
  ]);

  type AreaRow = {
    id:        string;
    nombre:    string;
    lider:     { id: string; nombre: string } | null;
    empleados: { id: string; nombre: string }[];
  };

  const areaRows: AreaRow[] = (areas ?? []).map((area) => {
    const miembros = (empleados ?? []).filter((e) => e.area_id === area.id);
    const lider    = miembros.find((e) => e.rol === "lider") ?? null;
    const rest     = miembros.filter((e) => e.rol === "empleado");
    return { id: area.id, nombre: area.nombre, lider, empleados: rest };
  });

  const initials = (name: string) =>
    name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Organigrama</h1>
        <p className="text-secondary text-sm">Estructura organizacional de {empresaData?.nombre ?? "la empresa"}</p>
      </div>

      {/* Nodo raíz — Gerente */}
      <div className="flex flex-col items-center mb-2">
        <div className="bg-surface rounded-xl border border-accent/30 shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-6 py-4 text-center w-64">
          <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-sm font-bold text-accent mx-auto mb-2">
            {initials(gerente.nombre)}
          </div>
          <p className="font-bold text-sm">{gerente.nombre}</p>
          <p className="text-[10px] text-accent uppercase tracking-[0.7px] mt-0.5">Gerente General</p>
          <p className="text-xs text-secondary mt-0.5">{empresaData?.nombre ?? "—"}</p>
        </div>
        <div className="w-px h-8 bg-[#1A2235]" />
      </div>

      {/* Áreas */}
      {areaRows.length === 0 ? (
        <div className="text-center py-12 text-secondary/60 text-sm">No hay áreas creadas todavía.</div>
      ) : (
        <div className="relative">
          {/* Línea horizontal superior */}
          {areaRows.length > 1 && (
            <div
              className="absolute top-0 bg-[#1A2235] h-px"
              style={{ left: `calc(${100 / areaRows.length / 2}%)`, right: `calc(${100 / areaRows.length / 2}%)` }}
            />
          )}
          <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(areaRows.length, 4)}, minmax(0, 1fr))` }}>
            {areaRows.map((area) => (
              <div key={area.id} className="flex flex-col items-center">
                <div className="w-px h-6 bg-[#1A2235]" />

                {/* Card del área + líder */}
                <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-4 py-3 text-center w-full mb-3">
                  <p className="text-[10px] text-secondary/50 uppercase tracking-[0.6px] mb-1">{area.nombre}</p>
                  {area.lider ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-blue-400/15 border border-blue-400/25 flex items-center justify-center text-xs font-bold text-blue-400 mx-auto mb-1.5">
                        {initials(area.lider.nombre)}
                      </div>
                      <p className="font-semibold text-xs">{area.lider.nombre}</p>
                      <p className="text-[10px] text-blue-400 uppercase tracking-[0.7px] mt-0.5">Líder</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-secondary/40 mt-1">Sin líder asignado</p>
                  )}
                  <div className="mt-2 pt-2 border-t border-[#1A2235]">
                    <p className="text-[10px] text-secondary/50">
                      {area.empleados.length} empleado{area.empleados.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Lista empleados */}
                {area.empleados.length > 0 && (
                  <div className="flex flex-col gap-1.5 w-full">
                    {area.empleados.slice(0, 5).map((emp) => (
                      <div key={emp.id} className="bg-[#0D1117] rounded-lg border border-[#1A2235] px-3 py-2 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-secondary flex-shrink-0">
                          {initials(emp.nombre)}
                        </div>
                        <p className="text-[11px] text-secondary truncate">{emp.nombre}</p>
                      </div>
                    ))}
                    {area.empleados.length > 5 && (
                      <div className="bg-[#0D1117] rounded-lg border border-[#1A2235] px-3 py-2 text-center">
                        <p className="text-[10px] text-secondary/50">+{area.empleados.length - 5} más</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-10 flex items-center gap-6 text-xs text-secondary border-t border-[#1A2235] pt-4">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent/40" /><span>Gerencia</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400/40" /><span>Líder de área</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white/10" /><span>Empleado</span></div>
        <div className="ml-auto flex items-center gap-1.5"><Network size={12} /><span>Datos en tiempo real</span></div>
      </div>
    </div>
  );
}
