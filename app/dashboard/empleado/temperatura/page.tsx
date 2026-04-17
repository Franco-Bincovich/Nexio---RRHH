import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getEmpleadoScope } from "@/lib/lider-scope";
import { AlertCircle } from "lucide-react";
import TemperaturaClient from "./TemperaturaClient";

export default async function TemperaturaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getEmpleadoScope(user.id);

  if (!scope) {
    return (
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Temperatura del equipo</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <p className="text-sm">No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  // Histórico de respuestas (todas de la empresa si es demo, sino solo del empleado)
  const admin = createAdminClient();
  const historialBase = admin
    .from("respuestas_temperatura")
    .select("id, puntuacion, comentario, semana, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const { data: historial } = scope.es_demo
    ? await historialBase.eq("empresa_id", scope.empresa_id)
    : await historialBase.eq("empleado_id", scope.id);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-1">Temperatura del equipo</h1>
      <p className="text-secondary text-sm mb-6">Tu pulso semanal del clima laboral</p>
      <TemperaturaClient historial={historial ?? []} />
    </div>
  );
}
