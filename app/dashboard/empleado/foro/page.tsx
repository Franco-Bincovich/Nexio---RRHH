import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getEmpleadoScope } from "@/lib/lider-scope";
import { AlertCircle } from "lucide-react";
import ForoClient from "./ForoClient";

export default async function ForoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getEmpleadoScope(user.id);

  if (!scope) {
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

  const areaNombre = scope.area_nombre;
  const areaId = scope.area_id;

  // Mensajes del área (si demo → todas las áreas de la empresa)
  const mensajesAreaBase = supabase
    .from("foros_mensajes")
    .select("id, mensaje, created_at, area_id, autor:autor_id(nombre, rol)")
    .eq("empresa_id", scope.empresa_id)
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: mensajesArea } = scope.es_demo
    ? await mensajesAreaBase.not("area_id", "is", null)
    : areaId
      ? await mensajesAreaBase.eq("area_id", areaId)
      : { data: [] };

  // Mensajes del foro RRHH general (últimos 100)
  const { data: mensajesRrhh } = await supabase
    .from("foros_mensajes")
    .select("id, mensaje, created_at, area_id, autor:autor_id(nombre, rol)")
    .eq("empresa_id", scope.empresa_id)
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
        empleadoNombre={scope.nombre}
      />
    </div>
  );
}
