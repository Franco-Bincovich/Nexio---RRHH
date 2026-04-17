import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getEmpleadoScope } from "@/lib/lider-scope";
import { Wifi, Home, ClipboardEdit, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { MetodoRegistro, AsistenciaTipo } from "@/types/database";
import RegistrarHomeButton from "@/components/empleado/RegistrarHomeButton";

const METODO_CONFIG: Record<MetodoRegistro, { label: string; icon: React.ElementType }> = {
  wifi:   { label: "Wi-Fi",   icon: Wifi },
  home:   { label: "Home",    icon: Home },
  manual: { label: "Manual",  icon: ClipboardEdit },
};

const TIPO_CONFIG: Record<AsistenciaTipo, { label: string; icon: React.ElementType; color: string }> = {
  entrada: { label: "Entrada", icon: ArrowDownCircle, color: "text-accent" },
  salida:  { label: "Salida",  icon: ArrowUpCircle,   color: "text-orange-400" },
};

export default async function AsistenciaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getEmpleadoScope(user.id);

  if (!scope) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Mi asistencia</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <span className="text-sm">No se pudo cargar tu información. Intentá recargar la página.</span>
        </div>
      </div>
    );
  }

  let empresaEmpleadoIds: string[] | null = null;
  if (scope.es_demo) {
    const { data: empleadosEmpresa } = await supabase
      .from("empleados")
      .select("id")
      .eq("empresa_id", scope.empresa_id);
    empresaEmpleadoIds = (empleadosEmpresa ?? []).map((e) => e.id);
  }

  const registrosBase = supabase
    .from("registros_asistencia")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: registros } = empresaEmpleadoIds !== null
    ? await registrosBase.in("empleado_id", empresaEmpleadoIds.length > 0 ? empresaEmpleadoIds : [""])
    : await registrosBase.eq("empleado_id", scope.id);

  const hoy = new Date().toISOString().split("T")[0];
  // Entrada HOME de hoy sin salida registrada
  const entradaHoy = registros?.find(
    (r) => r.fecha === hoy && r.metodo === "home" && r.tipo === "entrada" && !r.hora_salida
  ) ?? null;

  const totalEntradas = registros?.filter((r) => r.tipo === "entrada").length ?? 0;
  const totalSalidas  = registros?.filter((r) => r.tipo === "salida").length  ?? 0;
  const ultimoRegistro = registros?.[0] ?? null;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mi asistencia</h1>
          <p className="text-secondary text-sm">Últimos 50 registros</p>
        </div>
        <RegistrarHomeButton empleadoId={scope.id} entradaHoyId={entradaHoy?.id ?? null} />
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Entradas registradas" value={totalEntradas} color="text-accent" />
        <StatCard label="Salidas registradas"  value={totalSalidas}  color="text-orange-400" />
        <StatCard
          label="Último registro"
          value={
            ultimoRegistro
              ? formatFecha(ultimoRegistro.fecha)
              : "—"
          }
          color="text-white"
        />
      </div>

      {/* Tabla */}
      {!registros || registros.length === 0 ? (
        <EmptyState />
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
                const tipo    = TIPO_CONFIG[r.tipo];
                const metodo  = METODO_CONFIG[r.metodo];
                const TipoIcon   = tipo.icon;
                const MetodoIcon = metodo.icon;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#1A2235] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium">{formatFecha(r.fecha)}</td>
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
    <div className="bg-surface rounded-2xl border border-[#1A2235] px-5 py-4">
      <p className="text-xs text-secondary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface rounded-2xl border border-[#1A2235] py-16 text-center">
      <p className="text-secondary text-sm">No hay registros de asistencia todavía.</p>
    </div>
  );
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatHora(hora: string) {
  return hora.slice(0, 5); // HH:MM
}
