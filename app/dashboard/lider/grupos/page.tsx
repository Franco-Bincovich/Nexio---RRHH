import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import GruposClient from "./GruposClient";

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, empresa_id, area_id")
    .eq("user_id", user.id)
    .single();

  if (!lider) redirect("/login");

  const admin = createAdminClient();

  // Empleados del área (para agregar como miembros)
  const { data: empleados } = await admin
    .from("empleados")
    .select("id, nombre")
    .eq("area_id", lider.area_id ?? "")
    .eq("activo", true)
    .order("nombre");

  // Grupos del área
  const { data: gruposRaw } = await admin
    .from("grupos")
    .select("id, nombre, descripcion")
    .eq("empresa_id", lider.empresa_id)
    .eq("area_id", lider.area_id ?? "")
    .order("created_at", { ascending: false });

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
