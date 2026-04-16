import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AreasClient from "./AreasClient";

export default async function AreasPage() {
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
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Áreas</h1>
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar la información de la empresa.
        </div>
      </div>
    );
  }

  const empresaId = rrhh.empresa_id;

  const [{ data: areas }, { data: empleados }, { data: lideres }] = await Promise.all([
    supabase.from("areas").select("id, nombre, lider_id").eq("empresa_id", empresaId).order("nombre"),
    supabase.from("empleados").select("area_id").eq("empresa_id", empresaId).eq("activo", true),
    supabase.from("empleados").select("id, nombre").eq("empresa_id", empresaId).eq("rol", "lider").eq("activo", true).order("nombre"),
  ]);

  // Lider map
  const liderMap = Object.fromEntries((lideres ?? []).map((l) => [l.id, l.nombre]));

  // Count activos per area
  const countPerArea: Record<string, number> = {};
  for (const e of empleados ?? []) {
    if (e.area_id) countPerArea[e.area_id] = (countPerArea[e.area_id] ?? 0) + 1;
  }

  const areasConDatos = (areas ?? []).map((a) => ({
    ...a,
    liderNombre: a.lider_id ? (liderMap[a.lider_id] ?? null) : null,
    totalEmpleados: countPerArea[a.id] ?? 0,
  }));

  return (
    <AreasClient
      areas={areasConDatos}
      lideres={lideres ?? []}
    />
  );
}
