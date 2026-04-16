import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

function minutosAHorasStr(min: number): string {
  const sign = min < 0 ? "−" : min > 0 ? "+" : "";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

function horaAMinutos(hora: string): number {
  const [h, m, s] = hora.split(":").map(Number);
  return h * 60 + (m ?? 0) + Math.round((s ?? 0) / 60);
}

export default async function BancoHorasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, horas_laborables, banco_horas_ajuste")
    .eq("user_id", user.id)
    .single();

  if (!empleado) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Banco de horas</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          <p className="text-sm">No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  const horasLaborables = (empleado.horas_laborables ?? 8) * 60; // en minutos
  const ajuste = empleado.banco_horas_ajuste ?? 0;

  // Solo registros con hora_entrada Y hora_salida
  const { data: registros } = await supabase
    .from("registros_asistencia")
    .select("id, fecha, hora_entrada, hora_salida, metodo")
    .eq("empleado_id", empleado.id)
    .not("hora_entrada", "is", null)
    .not("hora_salida", "is", null)
    .order("fecha", { ascending: false })
    .limit(90);

  type FilaHora = {
    id: string;
    fecha: string;
    entrada: string;
    salida: string;
    trabajados: number;
    laborables: number;
    diferencia: number;
  };

  const filas: FilaHora[] = (registros ?? []).map((r) => {
    const trabajados = horaAMinutos(r.hora_salida) - horaAMinutos(r.hora_entrada);
    return {
      id: r.id,
      fecha: r.fecha,
      entrada: r.hora_entrada.slice(0, 5),
      salida: r.hora_salida.slice(0, 5),
      trabajados,
      laborables: horasLaborables,
      diferencia: trabajados - horasLaborables,
    };
  });

  const saldoBruto = filas.reduce((acc, f) => acc + f.diferencia, 0);
  const saldoTotal = saldoBruto + ajuste;

  const diasPositivos = filas.filter((f) => f.diferencia > 0).length;
  const diasNegativos = filas.filter((f) => f.diferencia < 0).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Banco de horas</h1>
      <p className="text-secondary text-sm mb-6">
        Calculado a partir de tus registros con entrada y salida
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Saldo total */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${saldoTotal >= 0 ? "bg-accent/10" : "bg-red-400/10"}`}>
            {saldoTotal > 0 ? <TrendingUp size={20} className="text-accent" /> : saldoTotal < 0 ? <TrendingDown size={20} className="text-red-400" /> : <Minus size={20} className="text-secondary" />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-0.5">Saldo actual</p>
            <p className={`text-[28px] font-extrabold leading-none ${saldoTotal > 0 ? "text-accent" : saldoTotal < 0 ? "text-red-400" : "text-white"}`}>
              {minutosAHorasStr(saldoTotal)}
            </p>
            {ajuste !== 0 && (
              <p className="text-[10px] text-secondary/50 mt-1">
                Incl. ajuste RRHH: {minutosAHorasStr(ajuste)}
              </p>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Días con extra</p>
          <p className="text-[22px] font-extrabold text-accent">{diasPositivos}</p>
        </div>

        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Días con déficit</p>
          <p className="text-[22px] font-extrabold text-red-400">{diasNegativos}</p>
        </div>
      </div>

      {/* Tabla historial */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Historial (últimos 90 días)</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{filas.length} registros</span>
        </div>

        {filas.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-secondary/60">
              No hay registros con entrada y salida registradas.
            </p>
            <p className="text-xs text-secondary/40 mt-1">
              El banco se calcula solo cuando hay hora de entrada y salida.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A2235] text-[10px] uppercase tracking-[0.7px] text-secondary">
                  <th className="text-left px-5 py-2.5 font-medium">Fecha</th>
                  <th className="text-right px-5 py-2.5 font-medium">Entrada</th>
                  <th className="text-right px-5 py-2.5 font-medium">Salida</th>
                  <th className="text-right px-5 py-2.5 font-medium">Trabajadas</th>
                  <th className="text-right px-5 py-2.5 font-medium">Laborables</th>
                  <th className="text-right px-5 py-2.5 font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className="border-b border-[#1A2235] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-medium text-sm">
                      {new Date(f.fecha + "T00:00:00").toLocaleDateString("es-AR", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 text-right text-secondary">{f.entrada}</td>
                    <td className="px-5 py-3 text-right text-secondary">{f.salida}</td>
                    <td className="px-5 py-3 text-right font-medium">
                      {minutosAHorasStr(f.trabajados).replace("+", "")}
                    </td>
                    <td className="px-5 py-3 text-right text-secondary">
                      {minutosAHorasStr(f.laborables).replace("+", "")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-bold ${f.diferencia > 0 ? "text-accent" : f.diferencia < 0 ? "text-red-400" : "text-secondary"}`}>
                        {minutosAHorasStr(f.diferencia)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
