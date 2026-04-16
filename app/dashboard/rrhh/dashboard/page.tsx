import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Users, UserPlus, Building2, UserX } from "lucide-react";

export default async function RrhhDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rrhh } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!rrhh?.empresa_id) {
    return (
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar la información de la empresa.
        </div>
      </div>
    );
  }

  const empresaId = rrhh.empresa_id;
  const hoy = new Date().toISOString().split("T")[0];

  // Total activos
  const { count: totalActivos } = await supabase
    .from("empleados")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  // Altas del mes
  const primerDiaMes = new Date();
  primerDiaMes.setDate(1);
  primerDiaMes.setHours(0, 0, 0, 0);
  const { count: altasMes } = await supabase
    .from("empleados")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .gte("created_at", primerDiaMes.toISOString());

  // Áreas activas (con al menos un empleado activo)
  const { data: empConArea } = await supabase
    .from("empleados")
    .select("area_id")
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .not("area_id", "is", null);
  const areasActivas = new Set((empConArea ?? []).map((e) => e.area_id)).size;

  // Ausencias del día
  const { data: empleadosActivos } = await supabase
    .from("empleados")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("activo", true);
  const empleadoIds = (empleadosActivos ?? []).map((e) => e.id);

  const { data: registrosHoy } = await supabase
    .from("registros_asistencia")
    .select("empleado_id")
    .in("empleado_id", empleadoIds.length > 0 ? empleadoIds : [""])
    .eq("fecha", hoy)
    .eq("tipo", "entrada");
  const presentesHoy = new Set((registrosHoy ?? []).map((r) => r.empleado_id)).size;
  const ausentes = (totalActivos ?? 0) - presentesHoy;

  // Últimas altas (5 más recientes)
  const { data: ultimasAltas } = await supabase
    .from("empleados")
    .select("id, nombre, email, rol, created_at, areas!empleados_area_id_fkey(nombre)")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-secondary text-sm">Recursos Humanos · {formatFecha(hoy)}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Empleados activos" value={totalActivos ?? 0} icon={Users}     color="text-accent" />
        <StatCard label="Altas del mes"      value={altasMes ?? 0}    icon={UserPlus}  color="text-green-400" />
        <StatCard label="Áreas activas"      value={areasActivas}     icon={Building2} color="text-blue-400" />
        <StatCard label="Ausentes hoy"       value={ausentes}         icon={UserX}     color="text-red-400" />
      </div>

      {/* Últimas altas */}
      <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <UserPlus size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Últimas incorporaciones</h2>
        </div>

        {!ultimasAltas || ultimasAltas.length === 0 ? (
          <p className="px-5 py-8 text-sm text-secondary">No hay altas registradas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                <th className="text-left px-5 py-2.5 font-medium">Empleado</th>
                <th className="text-left px-5 py-2.5 font-medium">Área</th>
                <th className="text-left px-5 py-2.5 font-medium">Rol</th>
                <th className="text-right px-5 py-2.5 font-medium">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {ultimasAltas.map((emp) => {
                const areaData = emp.areas as { nombre: string } | null;
                const initials = emp.nombre.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                return (
                  <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-border/10 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{emp.nombre}</p>
                          <p className="text-[10px] text-secondary">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-secondary">{areaData?.nombre ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-secondary capitalize">{emp.rol}</td>
                    <td className="px-5 py-3 text-xs text-secondary text-right">
                      {new Date(emp.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">{label}</p>
      </div>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
}
