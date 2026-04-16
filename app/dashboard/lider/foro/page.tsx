import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { AlertCircle } from "lucide-react";
import ForoLiderClient from "./ForoLiderClient";

type MensajeRaw = {
  id: string;
  mensaje: string;
  created_at: string;
  autor: { nombre: string; rol: string } | { nombre: string; rol: string }[] | null;
};

function normalizarMensajes(raw: MensajeRaw[] | null) {
  return (raw ?? []).map((m) => ({
    ...m,
    autor: Array.isArray(m.autor) ? (m.autor[0] ?? null) : m.autor,
  }));
}

export default async function ForoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, nombre, empresa_id, area_id, areas!empleados_area_id_fkey(nombre)")
    .eq("user_id", user.id)
    .single();

  if (!lider) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Comunicaciones</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <p className="text-sm">No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  const areaNombre = (lider.areas as { nombre: string } | null)?.nombre ?? null;
  const areaId = lider.area_id ?? null;

  const admin = createAdminClient();

  const [{ data: rawGerencia }, { data: rawRrhh }, { data: rawArea }] = await Promise.all([
    admin
      .from("foros_mensajes")
      .select("id, mensaje, created_at, autor:autor_id(nombre, rol)")
      .eq("empresa_id", lider.empresa_id)
      .eq("foro_tipo", "gerencia")
      .eq("area_id", areaId ?? "")
      .order("created_at", { ascending: false })
      .limit(100),

    admin
      .from("foros_mensajes")
      .select("id, mensaje, created_at, autor:autor_id(nombre, rol)")
      .eq("empresa_id", lider.empresa_id)
      .eq("foro_tipo", "rrhh")
      .is("area_id", null)
      .order("created_at", { ascending: false })
      .limit(100),

    areaId
      ? admin
          .from("foros_mensajes")
          .select("id, mensaje, created_at, autor:autor_id(nombre, rol)")
          .eq("empresa_id", lider.empresa_id)
          .eq("foro_tipo", "area")
          .eq("area_id", areaId)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="p-4 md:p-8 h-full">
      <h1 className="text-2xl font-bold mb-1">Comunicaciones</h1>
      <p className="text-secondary text-sm mb-5">
        {areaNombre ? `${areaNombre} · ` : ""}Gerencia · RRHH
      </p>
      <ForoLiderClient
        mensajesGerencia={normalizarMensajes(rawGerencia as MensajeRaw[])}
        mensajesRrhh={normalizarMensajes(rawRrhh as MensajeRaw[])}
        mensajesArea={normalizarMensajes(rawArea as MensajeRaw[])}
        areaNombre={areaNombre}
        areaId={areaId}
        liderNombre={lider.nombre}
      />
    </div>
  );
}
