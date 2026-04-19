import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { UserCheck } from "lucide-react";
import type { ModalidadTipo, RolSistema } from "@/types/database";

const MODALIDAD_LABEL: Record<ModalidadTipo, string> = {
  presencial: "Presencial",
  remoto:     "Remoto",
  hibrido:    "Híbrido",
};

const ROL_LABEL: Record<RolSistema, string> = {
  empleado: "Empleado",
  lider:    "Líder",
  gerente:  "Gerente",
  rrhh:     "RRHH",
};

const ROL_COLOR: Record<RolSistema, string> = {
  empleado: "text-secondary",
  lider:    "text-blue-400",
  gerente:  "text-accent",
  rrhh:     "text-purple-400",
};

export default async function EmpleadosPage() {
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
        <h1 className="text-2xl font-bold mb-4">Empleados</h1>
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar la información de la empresa.
        </div>
      </div>
    );
  }

  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, nombre, email, rol, modalidad, activo, area_id, areas!empleados_area_id_fkey(nombre)")
    .eq("empresa_id", gerente.empresa_id)
    .order("nombre");

  const activos   = (empleados ?? []).filter((e) => e.activo).length;
  const inactivos = (empleados ?? []).filter((e) => !e.activo).length;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Empleados</h1>
        <p className="text-secondary text-sm">
          {activos} activo{activos !== 1 ? "s" : ""}
          {inactivos > 0 ? ` · ${inactivos} inactivo${inactivos !== 1 ? "s" : ""}` : ""}
          {" · "}{(empleados ?? []).length} en total
        </p>
      </div>

      {!empleados || empleados.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border shadow-sm py-16 text-center">
          <p className="text-secondary text-sm">No hay empleados registrados todavía.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                <th className="text-left px-5 py-3 font-medium">Empleado</th>
                <th className="text-left px-5 py-3 font-medium">Área</th>
                <th className="text-left px-5 py-3 font-medium">Rol</th>
                <th className="text-left px-5 py-3 font-medium">Modalidad</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp) => {
                const areaData = emp.areas as { nombre: string } | null;
                const initials = emp.nombre
                  .split(" ")
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                return (
                  <tr
                    key={emp.id}
                    className="border-b border-border last:border-0 hover:bg-border/20 transition-colors"
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
                    <td className="px-5 py-3.5 text-secondary">
                      {areaData?.nombre ?? <span className="italic text-secondary/50">Sin área</span>}
                    </td>
                    <td className={`px-5 py-3.5 ${ROL_COLOR[emp.rol]}`}>
                      {ROL_LABEL[emp.rol]}
                    </td>
                    <td className="px-5 py-3.5 text-secondary">
                      {MODALIDAD_LABEL[emp.modalidad]}
                    </td>
                    <td className="px-5 py-3.5">
                      {emp.activo ? (
                        <span className="flex items-center gap-1.5 text-accent">
                          <UserCheck size={13} />
                          Activo
                        </span>
                      ) : (
                        <span className="text-secondary/50">Inactivo</span>
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
