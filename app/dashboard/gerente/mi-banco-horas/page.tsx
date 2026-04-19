import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

function min2str(min: number) {
  const s = min < 0 ? "−" : min > 0 ? "+" : "";
  const a = Math.abs(min); const h = Math.floor(a / 60); const m = a % 60;
  if (h === 0) return `${s}${m}m`; if (m === 0) return `${s}${h}h`; return `${s}${h}h ${m}m`;
}
function hora2min(h: string) { const [hh, mm, ss] = h.split(":").map(Number); return hh * 60 + (mm ?? 0) + Math.round((ss ?? 0) / 60); }

export default async function MiBancoHorasGerentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase.from("empleados").select("id, horas_laborables, banco_horas_ajuste").eq("user_id", user.id).single();
  if (!gerente) redirect("/login");

  const hl    = (gerente.horas_laborables ?? 8) * 60;
  const ajuste = gerente.banco_horas_ajuste ?? 0;
  const admin  = createAdminClient();

  const { data: registros } = await admin
    .from("registros_asistencia").select("id, fecha, hora_entrada, hora_salida")
    .eq("empleado_id", gerente.id).not("hora_entrada", "is", null).not("hora_salida", "is", null)
    .order("fecha", { ascending: false }).limit(90);

  const filas = (registros ?? []).map((r) => {
    const t = hora2min(r.hora_salida!) - hora2min(r.hora_entrada!);
    return { id: r.id, fecha: r.fecha, entrada: r.hora_entrada!.slice(0,5), salida: r.hora_salida!.slice(0,5), trabajados: t, laborables: hl, diferencia: t - hl };
  });

  const saldo     = filas.reduce((acc, f) => acc + f.diferencia, 0) + ajuste;
  const diasPos   = filas.filter((f) => f.diferencia > 0).length;
  const diasNeg   = filas.filter((f) => f.diferencia < 0).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Mi banco de horas</h1>
      <p className="text-secondary text-sm mb-6">Calculado a partir de tus registros con entrada y salida</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm px-5 py-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${saldo >= 0 ? "bg-accent/10" : "bg-red-400/10"}`}>
            {saldo > 0 ? <TrendingUp size={20} className="text-accent" /> : saldo < 0 ? <TrendingDown size={20} className="text-red-400" /> : <Minus size={20} className="text-secondary" />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-0.5">Saldo actual</p>
            <p className={`text-[28px] font-extrabold leading-none ${saldo > 0 ? "text-accent" : saldo < 0 ? "text-red-400" : "text-white"}`}>{min2str(saldo)}</p>
            {ajuste !== 0 && <p className="text-[10px] text-secondary/50 mt-1">Incl. ajuste: {min2str(ajuste)}</p>}
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4"><p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Días con extra</p><p className="text-[22px] font-extrabold text-accent">{diasPos}</p></div>
        <div className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4"><p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Días con déficit</p><p className="text-[22px] font-extrabold text-red-400">{diasNeg}</p></div>
      </div>
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Clock size={15} className="text-accent" /><h2 className="text-sm font-semibold">Historial (últimos 90 días)</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{filas.length} registros</span>
        </div>
        {filas.length === 0 ? (
          <div className="px-5 py-10 text-center"><p className="text-sm text-secondary/60">No hay registros con entrada y salida.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                <th className="text-left  px-5 py-2.5 font-medium">Fecha</th>
                <th className="text-right px-5 py-2.5 font-medium">Entrada</th>
                <th className="text-right px-5 py-2.5 font-medium">Salida</th>
                <th className="text-right px-5 py-2.5 font-medium">Trabajadas</th>
                <th className="text-right px-5 py-2.5 font-medium">Laborables</th>
                <th className="text-right px-5 py-2.5 font-medium">Diferencia</th>
              </tr></thead>
              <tbody>
                {filas.map((f) => {
                  const [fy, fm, fd] = f.fecha.split("-");
                  const ds = new Date(Number(fy), Number(fm)-1, Number(fd)).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
                  return (
                    <tr key={f.id} className="border-b border-border last:border-0 hover:bg-border/20 transition-colors">
                      <td className="px-5 py-3 font-medium">{ds}</td>
                      <td className="px-5 py-3 text-right text-secondary">{f.entrada}</td>
                      <td className="px-5 py-3 text-right text-secondary">{f.salida}</td>
                      <td className="px-5 py-3 text-right font-medium">{min2str(f.trabajados).replace("+","")}</td>
                      <td className="px-5 py-3 text-right text-secondary">{min2str(f.laborables).replace("+","")}</td>
                      <td className="px-5 py-3 text-right"><span className={`font-bold ${f.diferencia > 0 ? "text-accent" : f.diferencia < 0 ? "text-red-400" : "text-secondary"}`}>{min2str(f.diferencia)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
