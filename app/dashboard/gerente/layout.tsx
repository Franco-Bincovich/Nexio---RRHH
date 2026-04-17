import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Sidebar from "@/components/gerente/Sidebar";
import NotifBell from "@/components/NotifBell";
import { marcarLeida, marcarTodasLeidas } from "./notificaciones/actions";

export default async function GerenteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, nombre, email, rol, es_demo, empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!empleado) redirect("/login");

  if (!empleado.es_demo && empleado.rol !== "gerente") {
    redirect(`/dashboard/${empleado.rol}`);
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre")
    .eq("id", empleado.empresa_id)
    .single();

  // Pending solicitudes from líderes only
  const admin = createAdminClient();
  const { data: lideres } = await admin
    .from("empleados")
    .select("id")
    .eq("empresa_id", empleado.empresa_id)
    .eq("rol", "lider")
    .eq("activo", true);

  let pendingSolicitudes = 0;
  if (lideres && lideres.length > 0) {
    const liderIds = lideres.map((l) => l.id);
    const [
      { count: c1 },
      { count: c2 },
      { count: c3 },
    ] = await Promise.all([
      admin.from("solicitudes_ausencia").select("*", { count: "exact", head: true }).in("empleado_id", liderIds).eq("estado", "pendiente"),
      admin.from("solicitudes_retiro").select("*", { count: "exact", head: true }).in("empleado_id", liderIds).eq("estado", "pendiente"),
      admin.from("solicitudes_vacaciones").select("*", { count: "exact", head: true }).in("empleado_id", liderIds).eq("estado", "pendiente"),
    ]);
    pendingSolicitudes = (c1 ?? 0) + (c2 ?? 0) + (c3 ?? 0);
  }

  const { data: notifs } = await supabase
    .from("notificaciones")
    .select("id, mensaje, tipo, leida, created_at")
    .eq("destinatario_id", empleado.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="min-h-screen bg-base text-foreground">
      <Sidebar
        nombre={empleado.nombre}
        email={empleado.email}
        empresaNombre={empresa?.nombre ?? null}
        pendingSolicitudes={pendingSolicitudes}
      />
      {/* Desktop header con campana */}
      <div className="hidden lg:flex fixed top-0 right-0 left-64 h-12 bg-base/80 backdrop-blur-sm border-b border-border items-center justify-end px-6 z-30">
        <NotifBell
          notifs={notifs ?? []}
          onMarcarLeida={marcarLeida}
          onMarcarTodas={marcarTodasLeidas}
        />
      </div>
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-12 min-h-screen">
        {children}
      </main>
    </div>
  );
}
