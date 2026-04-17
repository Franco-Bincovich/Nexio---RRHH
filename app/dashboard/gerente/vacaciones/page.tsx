import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import VacacionesGerenteClient from "./VacacionesGerenteClient";
import type { SolicitudVacacion } from "@/components/MapaVacaciones";
import type { VacacionFila } from "@/lib/export-vacaciones";

export type EmpleadoMini = {
  id: string;
  nombre: string;
  rol: string;
  area_id: string | null;
  area_nombre: string | null;
};

export default async function GerenteVacacionesPage() {
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

  const { data: empleados } = await admin
    .from("empleados")
    .select("id, nombre, rol, area_id, areas!empleados_area_id_fkey(nombre)")
    .eq("empresa_id", gerente.empresa_id)
    .eq("activo", true);

  const empMap = new Map<string, EmpleadoMini>();
  for (const e of (empleados ?? [])) {
    const areas = e.areas as { nombre: string } | { nombre: string }[] | null;
    const area_nombre = Array.isArray(areas) ? areas[0]?.nombre ?? null : areas?.nombre ?? null;
    empMap.set(e.id, {
      id: e.id,
      nombre: e.nombre,
      rol: e.rol,
      area_id: e.area_id ?? null,
      area_nombre,
    });
  }

  const { data: areasRaw } = await admin
    .from("areas")
    .select("id, nombre")
    .eq("empresa_id", gerente.empresa_id)
    .order("nombre");

  const ids = Array.from(empMap.keys());

  let solicitudes: SolicitudVacacion[] = [];
  let filas: VacacionFila[] = [];

  if (ids.length > 0) {
    const { data: sols } = await admin
      .from("solicitudes_vacaciones")
      .select("id, empleado_id, fecha_desde, fecha_hasta, dias, estado")
      .in("empleado_id", ids)
      .in("estado", ["aprobada", "pendiente"])
      .order("fecha_desde", { ascending: true });

    for (const s of (sols ?? [])) {
      const info = empMap.get(s.empleado_id);
      if (!info) continue;
      solicitudes.push({
        id: s.id,
        empleado_id: s.empleado_id,
        empleado_nombre: info.nombre,
        fecha_desde: s.fecha_desde,
        fecha_hasta: s.fecha_hasta,
        estado: s.estado as "aprobada" | "pendiente",
      });
      filas.push({
        empleado_nombre: info.nombre,
        area_nombre: info.area_nombre,
        cargo: info.rol,
        fecha_desde: s.fecha_desde,
        fecha_hasta: s.fecha_hasta,
        dias: s.dias ?? 0,
        estado: s.estado,
      });
    }
  }

  // Mapa empleado_id → area_id para filtros en cliente
  const empleadosAreaMap: Record<string, string | null> = {};
  const empleadoRolMap: Record<string, string> = {};
  for (const e of empMap.values()) {
    empleadosAreaMap[e.id] = e.area_id;
    empleadoRolMap[e.id] = e.rol;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Vacaciones</h1>
        <p className="text-secondary text-sm">Mapa de vacaciones de la empresa</p>
      </div>
      <VacacionesGerenteClient
        solicitudes={solicitudes}
        filas={filas}
        areas={areasRaw ?? []}
        empleadosAreaMap={empleadosAreaMap}
        empleadoRolMap={empleadoRolMap}
      />
    </div>
  );
}
