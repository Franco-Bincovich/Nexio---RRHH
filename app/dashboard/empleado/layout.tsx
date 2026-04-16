import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "@/components/empleado/Sidebar";
import NotifBell from "@/components/NotifBell";
import { marcarLeida, marcarTodasLeidas } from "@/app/dashboard/empleado/notificaciones/actions";

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: empleado, error: empleadoError } = await supabase
    .from("empleados")
    .select("id, nombre, email, rol, areas!empleados_area_id_fkey(nombre)")
    .eq("user_id", user.id)
    .single();

  if (!empleado) redirect("/login");
  if (empleado.rol !== "empleado") redirect(`/dashboard/${empleado.rol}`);

  const areaNombre = Array.isArray(empleado.areas)
    ? (empleado.areas[0] as { nombre: string } | undefined)?.nombre ?? null
    : (empleado.areas as { nombre: string } | null)?.nombre ?? null;

  const { data: notifs } = await supabase
    .from("notificaciones")
    .select("id, mensaje, tipo, leida, created_at")
    .eq("destinatario_id", empleado.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="min-h-screen bg-base">
      <Sidebar
        nombre={empleado.nombre}
        email={empleado.email}
        areaNombre={areaNombre}
      />
      {/* Header desktop con campana de notificaciones */}
      <div className="hidden lg:flex fixed top-0 right-0 left-64 h-12 bg-base/80 backdrop-blur-sm border-b border-border items-center justify-end px-6 z-30">
        <NotifBell
          notifs={notifs ?? []}
          onMarcarLeida={marcarLeida}
          onMarcarTodas={marcarTodasLeidas}
        />
      </div>

      <main className="pt-14 lg:pt-12 lg:pl-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
