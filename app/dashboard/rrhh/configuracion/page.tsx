import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import ConfiguracionClient from "./ConfiguracionClient";

export type EmpresaConfig = {
  logo_url: string | null;
  dias_vacaciones: number;
  hora_entrada: string;
  hora_salida: string;
  modalidades_habilitadas: string[];
  password_default: string;
  notif_ausentismo: boolean;
  notif_objetivos_vencidos: boolean;
  notif_resumen_semanal: boolean;
  notif_nuevos_empleados: boolean;
};

const CONFIG_DEFAULTS: EmpresaConfig = {
  logo_url: null,
  dias_vacaciones: 20,
  hora_entrada: "09:00",
  hora_salida: "18:00",
  modalidades_habilitadas: ["presencial", "remoto", "hibrido"],
  password_default: "nexio1234",
  notif_ausentismo: true,
  notif_objetivos_vencidos: false,
  notif_resumen_semanal: true,
  notif_nuevos_empleados: true,
};

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("empleados")
    .select("empresa_id, rol, es_demo")
    .eq("user_id", user.id)
    .single();
  if (!me) redirect("/login");
  if (!me.es_demo && me.rol !== "rrhh") redirect("/login");

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const [{ data: empresa }, { data: configRow }, { data: areas }] =
    await Promise.all([
      admin.from("empresas").select("nombre").eq("id", me.empresa_id).single(),
      adminAny
        .from("empresa_config")
        .select("*")
        .eq("empresa_id", me.empresa_id)
        .maybeSingle(),
      admin.from("areas").select("id, nombre").eq("empresa_id", me.empresa_id).order("nombre"),
    ]);

  const config: EmpresaConfig = configRow
    ? {
        logo_url: configRow.logo_url ?? null,
        dias_vacaciones: configRow.dias_vacaciones ?? CONFIG_DEFAULTS.dias_vacaciones,
        hora_entrada: configRow.hora_entrada ?? CONFIG_DEFAULTS.hora_entrada,
        hora_salida: configRow.hora_salida ?? CONFIG_DEFAULTS.hora_salida,
        modalidades_habilitadas: configRow.modalidades_habilitadas ?? CONFIG_DEFAULTS.modalidades_habilitadas,
        password_default: configRow.password_default ?? CONFIG_DEFAULTS.password_default,
        notif_ausentismo: configRow.notif_ausentismo ?? CONFIG_DEFAULTS.notif_ausentismo,
        notif_objetivos_vencidos: configRow.notif_objetivos_vencidos ?? CONFIG_DEFAULTS.notif_objetivos_vencidos,
        notif_resumen_semanal: configRow.notif_resumen_semanal ?? CONFIG_DEFAULTS.notif_resumen_semanal,
        notif_nuevos_empleados: configRow.notif_nuevos_empleados ?? CONFIG_DEFAULTS.notif_nuevos_empleados,
      }
    : CONFIG_DEFAULTS;

  return (
    <ConfiguracionClient
      empresaNombre={empresa?.nombre ?? ""}
      config={config}
      areas={(areas ?? []) as { id: string; nombre: string }[]}
    />
  );
}
