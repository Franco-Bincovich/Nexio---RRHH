import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import ObjetivosClient from "./ObjetivosClient";

export default async function ObjetivosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, empresa_id, area_id")
    .eq("user_id", user.id)
    .single();

  if (!lider) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Objetivos</h1>
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar tu información. Intentá recargar la página.
        </div>
      </div>
    );
  }

  // Empleados del área
  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, nombre")
    .eq("area_id", lider.area_id ?? "")
    .eq("activo", true)
    .order("nombre");

  const empleadoIds = empleados?.map((e) => e.id) ?? [];
  const empleadoMap = Object.fromEntries((empleados ?? []).map((e) => [e.id, e.nombre]));

  // Objetivos del área
  const { data: objetivosRaw } = await supabase
    .from("objetivos")
    .select("*")
    .in("empleado_id", empleadoIds.length > 0 ? empleadoIds : [""])
    .order("created_at", { ascending: false });

  const objetivos = (objetivosRaw ?? []).map((o) => ({
    ...o,
    empleado_nombre: empleadoMap[o.empleado_id] ?? "—",
  }));

  // Historial global del área — query por empresa_id para incluir objetivos eliminados
  const admin = createAdminClient();
  const objetivoTituloMap = Object.fromEntries((objetivosRaw ?? []).map((o) => [o.id, o.titulo]));

  const { data: historialArea } = await admin
    .from("objetivos_historial")
    .select("id, objetivo_id, lider_nombre, campo_modificado, valor_anterior, valor_nuevo, fecha")
    .eq("empresa_id", lider.empresa_id)
    .order("fecha", { ascending: false })
    .limit(50);

  return (
    <ObjetivosClient
      objetivos={objetivos}
      empleados={empleados ?? []}
      empresaId={lider.empresa_id}
      liderEmpleadoId={lider.id}
      historialArea={historialArea ?? []}
      objetivoTituloMap={objetivoTituloMap}
    />
  );
}
