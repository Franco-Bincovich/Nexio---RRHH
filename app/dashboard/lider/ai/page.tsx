import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AiChatClient from "./AiChatClient";

export default async function NexioAiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("id, area_id, empresa_id, areas!empleados_area_id_fkey(nombre)")
    .eq("user_id", user.id)
    .single();

  if (!lider?.area_id) {
    return (
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Nexio AI</h1>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          No tenés un área asignada. Nexio AI requiere un área para acceder a los datos del equipo.
        </div>
      </div>
    );
  }

  const areaData   = lider.areas as { nombre: string } | null;
  const areaNombre = areaData?.nombre ?? "Mi área";

  return (
    <AiChatClient
      areaId={lider.area_id}
      empresaId={lider.empresa_id}
      areaNombre={areaNombre}
    />
  );
}
