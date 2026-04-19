import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { Wifi, Home, ClipboardEdit, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import RegistrarHomeGerenteButton from "@/components/gerente/RegistrarHomeGerenteButton";

const METODO_CONFIG = { wifi: { label: "Wi-Fi", icon: Wifi }, home: { label: "Home", icon: Home }, manual: { label: "Manual", icon: ClipboardEdit } } as const;
const TIPO_CONFIG   = { entrada: { label: "Entrada", icon: ArrowDownCircle, color: "text-accent" }, salida: { label: "Salida", icon: ArrowUpCircle, color: "text-orange-400" } } as const;

export default async function MiAsistenciaGerentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase.from("empleados").select("id").eq("user_id", user.id).single();
  if (!gerente) redirect("/login");

  const admin = createAdminClient();
  const { data: registros } = await admin
    .from("registros_asistencia")
    .select("id, fecha, tipo, metodo, hora_entrada, hora_salida, created_at")
    .eq("empleado_id", gerente.id)
    .order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(50);

  const hoy         = new Date().toISOString().split("T")[0];
  const entradaHoy  = registros?.find((r) => r.fecha === hoy && r.metodo === "home" && r.tipo === "entrada" && !r.hora_salida) ?? null;
  const totalEntradas = registros?.filter((r) => r.tipo === "entrada").length ?? 0;
  const totalSalidas  = registros?.filter((r) => r.tipo === "salida").length  ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div><h1 className="text-2xl font-bold mb-1">Mi asistencia</h1><p className="text-secondary text-sm">Últimos 50 registros</p></div>
        <RegistrarHomeGerenteButton empleadoId={gerente.id} entradaHoyId={entradaHoy?.id ?? null} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Entradas registradas" value={totalEntradas}   color="text-accent" />
        <StatCard label="Salidas registradas"  value={totalSalidas}    color="text-orange-400" />
        <StatCard label="Último registro"      value={registros?.[0] ? fmt(registros[0].fecha) : "—"} color="text-white" />
      </div>
      {!registros || registros.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border py-16 text-center"><p className="text-secondary text-sm">No hay registros todavía.</p></div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-secondary text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">Fecha</th>
              <th className="text-left px-5 py-3 font-medium">Tipo</th>
              <th className="text-left px-5 py-3 font-medium">Hora entrada</th>
              <th className="text-left px-5 py-3 font-medium">Hora salida</th>
              <th className="text-left px-5 py-3 font-medium">Método</th>
            </tr></thead>
            <tbody>
              {registros.map((r) => {
                const tipo   = TIPO_CONFIG[r.tipo   as keyof typeof TIPO_CONFIG];
                const metodo = METODO_CONFIG[r.metodo as keyof typeof METODO_CONFIG];
                const TI = tipo?.icon   ?? ArrowDownCircle;
                const MI = metodo?.icon ?? ClipboardEdit;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-border/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium">{fmt(r.fecha)}</td>
                    <td className="px-5 py-3.5"><span className={`flex items-center gap-1.5 ${tipo?.color ?? ""}`}><TI size={14} />{tipo?.label ?? r.tipo}</span></td>
                    <td className="px-5 py-3.5 text-secondary">{r.hora_entrada ? r.hora_entrada.slice(0,5) : "—"}</td>
                    <td className="px-5 py-3.5 text-secondary">{r.hora_salida  ? r.hora_salida.slice(0,5)  : "—"}</td>
                    <td className="px-5 py-3.5"><span className="flex items-center gap-1.5 text-secondary"><MI size={13} />{metodo?.label ?? r.metodo}</span></td>
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

function fmt(fecha: string) {
  const [y, m, d] = fecha.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("es-AR", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="bg-surface rounded-2xl border border-border px-5 py-4"><p className="text-xs text-secondary mb-1">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div>;
}
