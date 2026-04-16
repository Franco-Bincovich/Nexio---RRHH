import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AlertCircle } from "lucide-react";
import AusenciasClient from "./AusenciasClient";

export default async function AusenciasPage() {
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
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Inasistencias</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <p className="text-sm">No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  const { data: solicitudes } = await supabase
    .from("solicitudes_ausencia")
    .select("*")
    .eq("empleado_id", empleado.id)
    .order("created_at", { ascending: false });

  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Inasistencias</h1>
      <p className="text-secondary text-sm mb-6">Registrá y hacé seguimiento de tus ausencias</p>
      <AusenciasClient solicitudes={solicitudes ?? []} hoy={hoy} />
    </div>
  );
}
