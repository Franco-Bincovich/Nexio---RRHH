import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { AlertCircle } from "lucide-react";
import TemperaturaClient from "./TemperaturaClient";

export default async function TemperaturaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!empleado) {
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

  // Todas las respuestas del empleado, ordenadas por fecha desc (admin para bypassear RLS)
  const admin = createAdminClient();
  const { data: historial } = await admin
    .from("respuestas_temperatura")
    .select("id, puntuacion, comentario, semana, created_at")
    .eq("empleado_id", empleado.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-1">Temperatura del equipo</h1>
      <p className="text-secondary text-sm mb-6">Tu pulso semanal del clima laboral</p>
      <TemperaturaClient historial={historial ?? []} />
    </div>
  );
}
