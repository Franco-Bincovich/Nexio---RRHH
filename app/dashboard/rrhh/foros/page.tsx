import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import ForosClient from "./ForosClient";

export type Mensaje = {
  id: string;
  area_id: string | null;
  autor_id: string;
  mensaje: string;
  created_at: string;
};

export type Area = { id: string; nombre: string };
export type Empleado = { id: string; nombre: string; rol: string };

export default async function ForosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("empleados")
    .select("id, empresa_id, rol")
    .eq("user_id", user.id)
    .single();
  if (!me || me.rol !== "rrhh") redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const [{ data: mensajes }, { data: areas }, { data: empleados }] =
    await Promise.all([
      admin
        .from("foros_mensajes")
        .select("id, area_id, autor_id, mensaje, created_at")
        .eq("empresa_id", me.empresa_id)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("areas")
        .select("id, nombre")
        .eq("empresa_id", me.empresa_id)
        .order("nombre"),
      supabase
        .from("empleados")
        .select("id, nombre, rol")
        .eq("empresa_id", me.empresa_id)
        .eq("activo", true),
    ]);

  return (
    <ForosClient
      empresaId={me.empresa_id}
      mensajes={(mensajes ?? []) as Mensaje[]}
      areas={(areas ?? []) as Area[]}
      empleados={(empleados ?? []) as Empleado[]}
    />
  );
}
