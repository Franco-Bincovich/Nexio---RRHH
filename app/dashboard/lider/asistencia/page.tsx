import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getLiderScope } from "@/lib/lider-scope";
import { Wifi, Home, ClipboardEdit, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { MetodoRegistro, AsistenciaTipo } from "@/types/database";
import AsistenciaExportBtn, { type AsistenciaRow } from "./AsistenciaExportBtn";

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

  const scope = await getLiderScope(user.id);

  if (!scope || (!scope.es_demo && !scope.area_id)) {
    return (
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Asistencia del área</h1>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          No tenés un área asignada.
        </div>
      </div>
    );
  }

  // Empleados del área (o de toda la empresa si es demo)
  const empleadosBase = supabase
    .from("empleados")
    .select("id, nombre")
    .eq("activo", true);
  const { data: empleados } = scope.es_demo
    ? await empleadosBase.eq("empresa_id", scope.empresa_id)
    : await empleadosBase.eq("area_id", scope.area_id!);

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

  // Rows para export
  function calcHoras(entrada: string | null, salida: string | null): string {
    if (!entrada || !salida) return "";
    const [h1, m1] = entrada.split(":").map(Number);
    const [h2, m2] = salida.split(":").map(Number);
    const min = (h2 * 60 + (m2 ?? 0)) - (h1 * 60 + (m1 ?? 0));
    if (!Number.isFinite(min) || min <= 0) return "";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const areaNombre = scope.area_nombre ?? "—";
  const exportRows: AsistenciaRow[] = (registros ?? []).map((r) => ({
    empleado:     empleadoMap[r.empleado_id] ?? "—",
    area:         areaNombre,
    fecha:        r.fecha,
    hora_entrada: r.hora_entrada ?? "",
    hora_salida:  r.hora_salida ?? "",
    metodo:       r.metodo,
    horas:        calcHoras(r.hora_entrada, r.hora_salida),
  }));
  const scopeLabel = scope.es_demo ? "empresa" : (scope.area_nombre ?? "area");

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">Asistencia del área</h1>
          <p className="text-secondary text-sm">Últimos 100 registros</p>
        </div>
        <AsistenciaExportBtn rows={exportRows} scopeLabel={scopeLabel} />
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
