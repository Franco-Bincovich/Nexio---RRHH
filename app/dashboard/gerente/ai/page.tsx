import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AiGerenteClient from "./AiGerenteClient";

export default async function NexioAiGerentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!gerente) redirect("/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre")
    .eq("id", gerente.empresa_id)
    .single();

  return (
    <AiGerenteClient
      empresaId={gerente.empresa_id}
      empresaNombre={empresa?.nombre ?? "Mi empresa"}
    />
  );
}
