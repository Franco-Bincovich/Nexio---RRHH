import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getLiderScope } from "@/lib/lider-scope";
import GruposClient from "./GruposClient";

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getLiderScope(user.id);
  if (!scope) redirect("/login");

  const admin = createAdminClient();

  // Empleados disponibles como miembros (área o empresa completa si es demo)
  const empleadosBase = admin
    .from("empleados")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  const { data: empleados } = scope.es_demo
    ? await empleadosBase.eq("empresa_id", scope.empresa_id)
    : await empleadosBase.eq("area_id", scope.area_id ?? "");

  // Grupos del área (o de toda la empresa si es demo)
  const gruposBase = admin
    .from("grupos")
    .select("id, nombre, descripcion")
    .eq("empresa_id", scope.empresa_id)
    .order("created_at", { ascending: false });
  const { data: gruposRaw } = scope.es_demo
    ? await gruposBase
    : await gruposBase.eq("area_id", scope.area_id ?? "");

  const grupoIds = (gruposRaw ?? []).map((g) => g.id);

  // Miembros de todos los grupos
  const { data: miembrosRaw } = grupoIds.length > 0
    ? await admin
        .from("grupos_miembros")
        .select("id, grupo_id, empleado_id, empleados!grupos_miembros_empleado_id_fkey(nombre)")
        .in("grupo_id", grupoIds)
    : { data: [] };

  // Construir grupos con sus miembros
  type MiembroRaw = {
    id: string;
    grupo_id: string;
    empleado_id: string;
    empleados: { nombre: string } | { nombre: string }[] | null;
  };

  const miembrosPorGrupo: Record<string, { id: string; empleado_id: string; nombre: string }[]> = {};
  for (const m of (miembrosRaw as MiembroRaw[] ?? [])) {
    const emp = Array.isArray(m.empleados) ? m.empleados[0] : m.empleados;
    if (!miembrosPorGrupo[m.grupo_id]) miembrosPorGrupo[m.grupo_id] = [];
    miembrosPorGrupo[m.grupo_id].push({
      id: m.id,
      empleado_id: m.empleado_id,
      nombre: emp?.nombre ?? "—",
    });
  }

  const grupos = (gruposRaw ?? []).map((g) => ({
    ...g,
    miembros: miembrosPorGrupo[g.id] ?? [],
  }));

  return (
    <GruposClient
      grupos={grupos}
      empleados={empleados ?? []}
    />
  );
}
