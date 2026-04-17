import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getPreferencias } from "@/lib/notif-prefs";
import PreferenciasNotificaciones from "@/components/PreferenciasNotificaciones";
import NotificacionesHistorial from "@/components/NotificacionesHistorial";
import { guardarPreferenciasNotif, marcarLeida, marcarTodasLeidas } from "./actions";

export default async function NotificacionesRrhhPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!empleado) redirect("/login");

  const admin = createAdminClient();
  const prefs = await getPreferencias(admin, empleado.id);

  const { data: notifs } = await admin
    .from("notificaciones")
    .select("id, mensaje, tipo, leida, created_at")
    .eq("destinatario_id", empleado.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Notificaciones</h1>
        <p className="text-secondary text-sm">Historial y preferencias</p>
      </div>

      <NotificacionesHistorial
        notifs={notifs ?? []}
        onMarcarLeida={marcarLeida}
        onMarcarTodas={marcarTodasLeidas}
      />

      <PreferenciasNotificaciones initialPrefs={prefs} onSave={guardarPreferenciasNotif} />
    </div>
  );
}
