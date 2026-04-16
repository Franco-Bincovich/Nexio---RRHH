import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { Wifi, Home, ClipboardEdit, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import RegistrarHomeLiderButton from "@/components/lider/RegistrarHomeLiderButton";

const METODO_CONFIG = {
  wifi:   { label: "Wi-Fi",  icon: Wifi },
  home:   { label: "Home",   icon: Home },
  manual: { label: "Manual", icon: ClipboardEdit },
} as const;

const TIPO_CONFIG = {
  entrada: { label: "Entrada", icon: ArrowDownCircle, color: "text-accent" },
  salida:  { label: "Salida",  icon: ArrowUpCircle,   color: "text-orange-400" },
} as const;

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("es-AR", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

export default async function MiAsistenciaLiderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!lider) redirect("/login");

  const admin = createAdminClient();

  const { data: registros } = await admin
    .from("registros_asistencia")
    .select("id, fecha, tipo, metodo, hora_entrada, hora_salida, created_at")
    .eq("empleado_id", lider.id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const hoy = new Date().toISOString().split("T")[0];
  const entradaHoy = registros?.find(
    (r) => r.fecha === hoy && r.metodo === "home" && r.tipo === "entrada" && !r.hora_salida
  ) ?? null;

  const totalEntradas  = registros?.filter((r) => r.tipo === "entrada").length ?? 0;
  const totalSalidas   = registros?.filter((r) => r.tipo === "salida").length  ?? 0;
  const ultimoRegistro = registros?.[0] ?? null;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mi asistencia</h1>
          <p className="text-secondary text-sm">Últimos 50 registros</p>
        </div>
        <RegistrarHomeLiderButton empleadoId={lider.id} entradaHoyId={entradaHoy?.id ?? null} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Entradas registradas" value={totalEntradas}   color="text-accent" />
        <StatCard label="Salidas registradas"  value={totalSalidas}    color="text-orange-400" />
        <StatCard label="Último registro"      value={ultimoRegistro ? formatFecha(ultimoRegistro.fecha) : "—"} color="text-white" />
      </div>

      {/* Tabla */}
      {!registros || registros.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-[#1A2235] py-16 text-center">
          <p className="text-secondary text-sm">No hay registros de asistencia todavía.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-[#1A2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A2235] text-secondary text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Fecha</th>
                <th className="text-left px-5 py-3 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 font-medium">Hora entrada</th>
                <th className="text-left px-5 py-3 font-medium">Hora salida</th>
                <th className="text-left px-5 py-3 font-medium">Método</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const tipo   = TIPO_CONFIG[r.tipo as keyof typeof TIPO_CONFIG];
                const metodo = METODO_CONFIG[r.metodo as keyof typeof METODO_CONFIG];
                const TipoIcon   = tipo?.icon   ?? ArrowDownCircle;
                const MetodoIcon = metodo?.icon ?? ClipboardEdit;
                return (
                  <tr key={r.id} className="border-b border-[#1A2235] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium">{formatFecha(r.fecha)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`flex items-center gap-1.5 ${tipo?.color ?? ""}`}>
                        <TipoIcon size={14} />
                        {tipo?.label ?? r.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-secondary">{r.hora_entrada ? r.hora_entrada.slice(0, 5) : "—"}</td>
                    <td className="px-5 py-3.5 text-secondary">{r.hora_salida  ? r.hora_salida.slice(0, 5)  : "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-secondary">
                        <MetodoIcon size={13} />
                        {metodo?.label ?? r.metodo}
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
    <div className="bg-surface rounded-2xl border border-[#1A2235] px-5 py-4">
      <p className="text-xs text-secondary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
