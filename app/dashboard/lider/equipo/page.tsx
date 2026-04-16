import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { UserCheck, Home, Building2, Wifi } from "lucide-react";
import type { ModalidadTipo } from "@/types/database";

const MODALIDAD_CONFIG: Record<ModalidadTipo, { label: string; icon: React.ElementType; color: string }> = {
  presencial: { label: "Presencial", icon: Building2, color: "text-orange-400" },
  remoto:     { label: "Remoto",     icon: Wifi,      color: "text-blue-400" },
  hibrido:    { label: "Híbrido",    icon: Home,      color: "text-purple-400" },
};

export default async function EquipoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("area_id")
    .eq("user_id", user.id)
    .single();

  if (!lider?.area_id) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Mi equipo</h1>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          No tenés un área asignada. Contactá con RRHH o un gerente.
        </div>
      </div>
    );
  }

  const { data: equipo } = await supabase
    .from("empleados")
    .select("id, nombre, email, rol, modalidad, activo")
    .eq("area_id", lider.area_id)
    .order("nombre");

  const activos  = equipo?.filter((e) => e.activo).length  ?? 0;
  const inactivos = equipo?.filter((e) => !e.activo).length ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Mi equipo</h1>
        <p className="text-secondary text-sm">
          {activos} activo{activos !== 1 ? "s" : ""}
          {inactivos > 0 ? ` · ${inactivos} inactivo${inactivos !== 1 ? "s" : ""}` : ""}
        </p>
      </div>

      {!equipo || equipo.length === 0 ? (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] py-16 text-center">
          <p className="text-secondary text-sm">No hay empleados asignados a tu área todavía.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A2235] text-secondary text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Empleado</th>
                <th className="text-left px-5 py-3 font-medium">Rol</th>
                <th className="text-left px-5 py-3 font-medium">Modalidad</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((emp) => {
                const mod = MODALIDAD_CONFIG[emp.modalidad];
                const ModIcon = mod.icon;
                const initials = emp.nombre
                  .split(" ")
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                return (
                  <tr
                    key={emp.id}
                    className="border-b border-[#1A2235] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium">{emp.nombre}</p>
                          <p className="text-xs text-secondary">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-secondary capitalize">{emp.rol}</td>
                    <td className="px-5 py-3.5">
                      <span className={`flex items-center gap-1.5 ${mod.color}`}>
                        <ModIcon size={13} />
                        {mod.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {emp.activo ? (
                        <span className="flex items-center gap-1.5 text-accent">
                          <UserCheck size={13} />
                          Activo
                        </span>
                      ) : (
                        <span className="text-secondary">Inactivo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
