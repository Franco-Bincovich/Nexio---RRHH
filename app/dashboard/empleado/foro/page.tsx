import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AlertCircle } from "lucide-react";
import ForoClient from "./ForoClient";

export default async function ForoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, nombre, empresa_id, area_id, areas!empleados_area_id_fkey(nombre)")
    .eq("user_id", user.id)
    .single();

  if (!empleado) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Foro del área</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <p className="text-sm">No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  const areaNombre = (empleado.areas as { nombre: string } | null)?.nombre ?? null;
  const areaId = empleado.area_id ?? null;

  // Mensajes del área del empleado (últimos 100) — solo si tiene área asignada
  const { data: mensajesArea } = areaId
    ? await supabase
        .from("foros_mensajes")
        .select("id, mensaje, created_at, area_id, autor:autor_id(nombre, rol)")
        .eq("empresa_id", empleado.empresa_id)
        .eq("area_id", areaId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  // Mensajes del foro RRHH general (últimos 100)
  const { data: mensajesRrhh } = await supabase
    .from("foros_mensajes")
    .select("id, mensaje, created_at, area_id, autor:autor_id(nombre, rol)")
    .eq("empresa_id", empleado.empresa_id)
    .is("area_id", null)
    .order("created_at", { ascending: false })
    .limit(100);

  type MensajeRaw = {
    id: string;
    mensaje: string;
    created_at: string;
    area_id: string | null;
    autor: { nombre: string; rol: string } | { nombre: string; rol: string }[] | null;
  };

  function normalizarMensajes(raw: MensajeRaw[] | null) {
    return (raw ?? []).map((m) => ({
      ...m,
      autor: Array.isArray(m.autor) ? (m.autor[0] ?? null) : m.autor,
    }));
  }

  return (
    <div className="p-4 md:p-8 h-full">
      <h1 className="text-2xl font-bold mb-1">Foro</h1>
      <p className="text-secondary text-sm mb-5">
        {areaNombre ? `${areaNombre} · ` : ""}Foro RRHH
      </p>
      <ForoClient
        mensajesArea={normalizarMensajes(mensajesArea as MensajeRaw[])}
        mensajesRrhh={normalizarMensajes(mensajesRrhh as MensajeRaw[])}
        areaNombre={areaNombre}
        areaId={areaId}
        empleadoNombre={empleado.nombre}
      />
    </div>
  );
}
