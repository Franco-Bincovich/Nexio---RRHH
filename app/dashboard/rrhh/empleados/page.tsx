import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import EmpleadosClient from "./EmpleadosClient";

export default async function EmpleadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rrhh } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!rrhh?.empresa_id) {
    return (
      <div className="p-4 md:p-8 max-w-6xl">
        <h1 className="text-2xl font-bold mb-4">Empleados</h1>
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar la información de la empresa.
        </div>
      </div>
    );
  }

  const [{ data: empleados }, { data: areas }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombre, email, rol, modalidad, horas_laborables, activo, area_id, areas!empleados_area_id_fkey(nombre)")
      .eq("empresa_id", rrhh.empresa_id)
      .order("nombre"),
    supabase
      .from("areas")
      .select("id, nombre")
      .eq("empresa_id", rrhh.empresa_id)
      .order("nombre"),
  ]);

  return (
    <EmpleadosClient
      empleados={(empleados ?? []) as never}
      areas={areas ?? []}
    />
  );
}
