import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import ForoGerenteClient from "./ForoGerenteClient";

export default async function ComunicacionesGerentePage() {
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

  const baseQuery = () =>
    admin
      .from("foros_mensajes")
      .select("id, autor_id, mensaje, created_at, foro_tipo, autor:autor_id(nombre, rol)")
      .eq("empresa_id", gerente.empresa_id)
      .is("area_id", null)
      .order("created_at", { ascending: true })
      .limit(100);

  const [{ data: rawGerencia }, { data: rawRrhh }] = await Promise.all([
    baseQuery().eq("foro_tipo", "gerencia"),
    baseQuery().eq("foro_tipo", "rrhh"),
  ]);

  function norm(raw: typeof rawGerencia) {
    return (raw ?? []).map((m) => ({
      id:           m.id,
      autor_id:     m.autor_id,
      autor_nombre: (m.autor as { nombre: string; rol: string } | null)?.nombre ?? "—",
      autor_rol:    (m.autor as { nombre: string; rol: string } | null)?.rol    ?? "—",
      mensaje:      m.mensaje,
      created_at:   m.created_at,
      foro_tipo:    m.foro_tipo,
    }));
  }

  return (
    <ForoGerenteClient
      mensajesGerencia={norm(rawGerencia)}
      mensajesRrhh={norm(rawRrhh)}
      gerenteId={gerente.id}
    />
  );
}
