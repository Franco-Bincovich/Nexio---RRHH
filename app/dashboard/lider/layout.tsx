import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Sidebar from "@/components/lider/Sidebar";
import NotifBell from "@/components/NotifBell";
import { marcarLeida, marcarTodasLeidas } from "./notificaciones/actions";

export default async function LiderLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, nombre, email, rol, es_demo, area_id, empresa_id, areas!empleados_area_id_fkey(nombre)")
    .eq("user_id", user.id)
    .single();

  if (!empleado) redirect("/login");

  if (!empleado.es_demo && empleado.rol !== "lider") {
    redirect(`/dashboard/${empleado.rol}`);
  }

  const areaData = empleado.areas as { nombre: string } | null;

  // Contar solicitudes pendientes del equipo (o de toda la empresa si es demo)
  let pendingSolicitudes = 0;
  const admin = createAdminClient();
  const scopeFilter: { col: "empresa_id" | "area_id"; val: string } | null = empleado.es_demo
    ? { col: "empresa_id", val: empleado.empresa_id }
    : empleado.area_id
      ? { col: "area_id", val: empleado.area_id }
      : null;

  if (scopeFilter) {
    const { data: equipo } = await admin
      .from("empleados")
      .select("id")
      .eq("activo", true)
      .neq("id", empleado.id)
      .eq(scopeFilter.col, scopeFilter.val);

    const empleadoIds = equipo?.map((e) => e.id) ?? [];
    if (empleadoIds.length > 0) {
      const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
        admin.from("solicitudes_ausencia").select("id", { count: "exact", head: true }).in("empleado_id", empleadoIds).eq("estado", "pendiente"),
        admin.from("solicitudes_retiro").select("id", { count: "exact", head: true }).in("empleado_id", empleadoIds).eq("estado", "pendiente"),
        admin.from("solicitudes_vacaciones").select("id", { count: "exact", head: true }).in("empleado_id", empleadoIds).eq("estado", "pendiente"),
      ]);
      pendingSolicitudes = (c1 ?? 0) + (c2 ?? 0) + (c3 ?? 0);
    }
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
        areaNombre={areaData?.nombre ?? null}
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
