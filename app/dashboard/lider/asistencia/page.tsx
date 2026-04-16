import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Wifi, Home, ClipboardEdit, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { MetodoRegistro, AsistenciaTipo } from "@/types/database";

const METODO_CONFIG: Record<MetodoRegistro, { label: string; icon: React.ElementType }> = {
  wifi:   { label: "Wi-Fi",  icon: Wifi },
  home:   { label: "Home",   icon: Home },
  manual: { label: "Manual", icon: ClipboardEdit },
};

const TIPO_CONFIG: Record<AsistenciaTipo, { label: string; icon: React.ElementType; color: string }> = {
  entrada: { label: "Entrada", icon: ArrowDownCircle, color: "text-accent" },
  salida:  { label: "Salida",  icon: ArrowUpCircle,   color: "text-orange-400" },
};

export default async function LiderAsistenciaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("area_id")
    .eq("user_id", user.id)
    .single();

  if (!lider?.area_id) {
    return (
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Asistencia del área</h1>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          No tenés un área asignada.
        </div>
      </div>
    );
  }

  // Empleados del área
  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, nombre")
    .eq("area_id", lider.area_id)
    .eq("activo", true);

  const empleadoIds = empleados?.map((e) => e.id) ?? [];
  const empleadoMap = Object.fromEntries((empleados ?? []).map((e) => [e.id, e.nombre]));

  // Registros del área
  const { data: registros } = await supabase
    .from("registros_asistencia")
    .select("*")
    .in("empleado_id", empleadoIds.length > 0 ? empleadoIds : [""])
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const totalEntradas = registros?.filter((r) => r.tipo === "entrada").length ?? 0;
  const totalSalidas  = registros?.filter((r) => r.tipo === "salida").length  ?? 0;

  // Presentes hoy
  const hoy = new Date().toISOString().split("T")[0];
  const presentesHoy = new Set(
    registros?.filter((r) => r.fecha === hoy && r.tipo === "entrada").map((r) => r.empleado_id)
  ).size;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Asistencia del área</h1>
        <p className="text-secondary text-sm">Últimos 100 registros</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Entradas registradas" value={totalEntradas} color="text-accent" />
        <StatCard label="Salidas registradas"  value={totalSalidas}  color="text-orange-400" />
        <StatCard label="Presentes hoy"        value={presentesHoy}  color="text-green-400" />
      </div>

      {/* Tabla */}
      {!registros || registros.length === 0 ? (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] py-16 text-center">
          <p className="text-secondary text-sm">No hay registros de asistencia en el área todavía.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A2235] text-secondary text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Empleado</th>
                <th className="text-left px-5 py-3 font-medium">Fecha</th>
                <th className="text-left px-5 py-3 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 font-medium">Hora entrada</th>
                <th className="text-left px-5 py-3 font-medium">Hora salida</th>
                <th className="text-left px-5 py-3 font-medium">Método</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const tipo   = TIPO_CONFIG[r.tipo];
                const metodo = METODO_CONFIG[r.metodo];
                const TipoIcon   = tipo.icon;
                const MetodoIcon = metodo.icon;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#1A2235] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium">
                      {empleadoMap[r.empleado_id] ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">{formatFecha(r.fecha)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`flex items-center gap-1.5 ${tipo.color}`}>
                        <TipoIcon size={14} />
                        {tipo.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-secondary">
                      {r.hora_entrada ? formatHora(r.hora_entrada) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-secondary">
                      {r.hora_salida ? formatHora(r.hora_salida) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-secondary">
                        <MetodoIcon size={13} />
                        {metodo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
      <p className="text-[10px] uppercase tracking-[0.7px] text-secondary mb-1">{label}</p>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function formatHora(hora: string) {
  return hora.slice(0, 5);
}
