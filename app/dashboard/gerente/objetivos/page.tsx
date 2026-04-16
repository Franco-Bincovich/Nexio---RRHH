import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import ObjetivosGerenteClient from "./ObjetivosGerenteClient";

export default async function ObjetivosGerentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!gerente) redirect("/login");

  const admin = createAdminClient();

  const [{ data: areas }, { data: empleados }, { data: objetivosRaw }] = await Promise.all([
    admin.from("areas").select("id, nombre").eq("empresa_id", gerente.empresa_id),
    admin.from("empleados").select("id, nombre, area_id").eq("empresa_id", gerente.empresa_id).eq("activo", true),
    admin.from("objetivos").select("id, titulo, descripcion, progreso, estado, vencimiento, categoria, empleado_id")
      .in("empleado_id", (await admin.from("empleados").select("id").eq("empresa_id", gerente.empresa_id)).data?.map((e) => e.id) ?? []),
  ]);

  const empNombreMap: Record<string, string> = {};
  const empAreaMap: Record<string, string> = {};
  (empleados ?? []).forEach((e) => {
    empNombreMap[e.id] = e.nombre;
    if (e.area_id) empAreaMap[e.id] = e.area_id;
  });

  const objetivos = (objetivosRaw ?? []).map((o) => ({
    id:              o.id,
    titulo:          o.titulo,
    descripcion:     o.descripcion ?? null,
    progreso:        o.progreso ?? 0,
    estado:          o.estado as "pendiente" | "en_progreso" | "completado" | "cancelado",
    vencimiento:     o.vencimiento ?? null,
    categoria:       o.categoria ?? null,
    empleado_nombre: empNombreMap[o.empleado_id] ?? "—",
    area_id:         empAreaMap[o.empleado_id] ?? null,
  }));

  // Build areaEmpMap by objetivo id
  const areaByObjetivoId: Record<string, string> = {};
  objetivos.forEach((o) => {
    if (o.area_id) areaByObjetivoId[o.id] = o.area_id;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Objetivos</h1>
        <p className="text-secondary text-sm">Resumen global de toda la empresa</p>
      </div>
      <ObjetivosGerenteClient
        objetivos={objetivos}
        areas={areas ?? []}
        areaEmpMap={areaByObjetivoId}
      />
    </div>
  );
}
