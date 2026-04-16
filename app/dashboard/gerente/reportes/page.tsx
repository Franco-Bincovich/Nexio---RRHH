import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import ReportesGerenteClient from "./ReportesGerenteClient";

export default async function ReportesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!gerente?.empresa_id) redirect("/login");

  const admin = createAdminClient();
  const { data: areas } = await admin
    .from("areas")
    .select("id, nombre")
    .eq("empresa_id", gerente.empresa_id)
    .order("nombre");

  return (
    <ReportesGerenteClient
      empresaId={gerente.empresa_id}
      areas={areas ?? []}
    />
  );
}
