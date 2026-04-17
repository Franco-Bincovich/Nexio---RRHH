import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getEmpleadoScope } from "@/lib/lider-scope";
import { AlertCircle } from "lucide-react";
import AusenciasClient from "./AusenciasClient";

export default async function AusenciasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getEmpleadoScope(user.id);

  if (!scope) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Inasistencias</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <p className="text-sm">No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  let empresaEmpleadoIds: string[] | null = null;
  if (scope.es_demo) {
    const { data: empEmpresa } = await supabase
      .from("empleados")
      .select("id")
      .eq("empresa_id", scope.empresa_id);
    empresaEmpleadoIds = (empEmpresa ?? []).map((e) => e.id);
  }

  const solicitudesBase = supabase
    .from("solicitudes_ausencia")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: solicitudes } = empresaEmpleadoIds !== null
    ? await solicitudesBase.in("empleado_id", empresaEmpleadoIds.length > 0 ? empresaEmpleadoIds : [""])
    : await solicitudesBase.eq("empleado_id", scope.id);

  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Inasistencias</h1>
      <p className="text-secondary text-sm mb-6">Registrá y hacé seguimiento de tus ausencias</p>
      <AusenciasClient solicitudes={solicitudes ?? []} hoy={hoy} />
    </div>
  );
}
