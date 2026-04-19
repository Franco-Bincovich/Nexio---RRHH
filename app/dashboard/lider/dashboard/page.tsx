import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getLiderScope } from "@/lib/lider-scope";
import Link from "next/link";
import { Users, CheckCircle2, Home, Target, TrendingUp, UsersRound } from "lucide-react";

export default async function LiderDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getLiderScope(user.id);

  if (!scope || (!scope.es_demo && !scope.area_id)) {
    return (
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          No tenés un área asignada. Contactá con RRHH o un gerente.
        </div>
      </div>
    );
  }

  // Empleados del área (o de toda la empresa si es demo)
  const equipoBase = supabase
    .from("empleados")
    .select("id, nombre, modalidad, activo")
    .eq("activo", true);
  const { data: equipo } = scope.es_demo
    ? await equipoBase.eq("empresa_id", scope.empresa_id)
    : await equipoBase.eq("area_id", scope.area_id!);

  const totalEquipo = equipo?.length ?? 0;
  const remotos = equipo?.filter((e) => e.modalidad === "remoto" || e.modalidad === "hibrido").length ?? 0;
  const presenciales = equipo?.filter((e) => e.modalidad === "presencial").length ?? 0;

  // Objetivos del área
  const empleadoIds = equipo?.map((e) => e.id) ?? [];
  let objetivosData = { pendientes: 0, en_progreso: 0, completados: 0 };

  if (empleadoIds.length > 0) {
    const { data: objetivos } = await supabase
      .from("objetivos")
      .select("estado")
      .in("empleado_id", empleadoIds);

    if (objetivos) {
      objetivosData = {
        pendientes:  objetivos.filter((o) => o.estado === "pendiente").length,
        en_progreso: objetivos.filter((o) => o.estado === "en_progreso").length,
        completados: objetivos.filter((o) => o.estado === "completado").length,
      };
    }
  }

  // Asistencia de hoy
  const hoy = new Date().toISOString().split("T")[0];
  let presentesHoy = 0;
  if (empleadoIds.length > 0) {
    const { data: asistenciaHoy } = await supabase
      .from("registros_asistencia")
      .select("empleado_id")
      .in("empleado_id", empleadoIds)
      .eq("fecha", hoy)
      .eq("tipo", "entrada");
    const únicos = new Set(asistenciaHoy?.map((r) => r.empleado_id));
    presentesHoy = únicos.size;
  }

  const totalObjetivos = objetivosData.pendientes + objetivosData.en_progreso + objetivosData.completados;

  // Grupos del área (o de toda la empresa si es demo)
  const admin = createAdminClient();
  const gruposBase = admin
    .from("grupos")
    .select("id, nombre, descripcion, grupos_miembros(count)")
    .order("created_at", { ascending: false })
    .limit(4);
  const { data: gruposRaw } = scope.es_demo
    ? await gruposBase.eq("empresa_id", scope.empresa_id)
    : await gruposBase.eq("area_id", scope.area_id!);

  type GrupoDash = {
    id: string;
    nombre: string;
    descripcion: string | null;
    grupos_miembros: { count: number }[];
  };
  const grupos = (gruposRaw as GrupoDash[] ?? []).map((g) => ({
    id:          g.id,
    nombre:      g.nombre,
    descripcion: g.descripcion,
    miembros:    g.grupos_miembros?.[0]?.count ?? 0,
  }));

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-secondary text-sm">Resumen del área · hoy {formatFecha(hoy)}</p>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Equipo"
          value={totalEquipo}
          sub="empleados activos"
          icon={Users}
          color="text-accent"
        />
        <StatCard
          label="Presentes hoy"
          value={presentesHoy}
          sub={`de ${totalEquipo}`}
          icon={CheckCircle2}
          color="text-green-400"
        />
        <StatCard
          label="Home / Remoto"
          value={remotos}
          sub="modalidad remota"
          icon={Home}
          color="text-blue-400"
        />
        <StatCard
          label="Presencial"
          value={presenciales}
          sub="modalidad presencial"
          icon={TrendingUp}
          color="text-orange-400"
        />
      </div>

      {/* Objetivos */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Target size={16} className="text-accent" />
          <h2 className="text-sm font-semibold">Estado de objetivos del área</h2>
          {totalObjetivos > 0 && (
            <span className="ml-auto text-xs text-secondary">{totalObjetivos} en total</span>
          )}
        </div>

        {totalObjetivos === 0 ? (
          <p className="text-sm text-secondary">No hay objetivos asignados en el área todavía.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <ObjetivoStatCard label="Pendientes"  value={objetivosData.pendientes}  color="text-yellow-400" bg="bg-yellow-400/10" />
            <ObjetivoStatCard label="En progreso" value={objetivosData.en_progreso} color="text-blue-400"   bg="bg-blue-400/10" />
            <ObjetivoStatCard label="Completados" value={objetivosData.completados} color="text-accent"     bg="bg-accent/10" />
          </div>
        )}
      </div>

      {/* Grupos de trabajo */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6 mt-6">
        <div className="flex items-center gap-2 mb-5">
          <UsersRound size={16} className="text-accent" />
          <h2 className="text-sm font-semibold">Grupos de trabajo</h2>
          <Link
            href="/dashboard/lider/grupos"
            className="ml-auto text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Ver todos →
          </Link>
        </div>

        {grupos.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-secondary/60 mb-2">No hay grupos creados todavía.</p>
            <Link
              href="/dashboard/lider/grupos"
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Crear primer grupo →
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {grupos.map((g) => (
              <div
                key={g.id}
                className="bg-white/[0.02] border border-border rounded-xl px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{g.nombre}</p>
                  <span className="flex items-center gap-1 text-[10px] text-secondary/60 flex-shrink-0">
                    <UsersRound size={10} />
                    {g.miembros}
                  </span>
                </div>
                {g.descripcion && (
                  <p className="text-xs text-secondary/60 mt-0.5 line-clamp-1">{g.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: number; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">{label}</p>
      </div>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-[0.7px] text-secondary mt-1">{sub}</p>
    </div>
  );
}

function ObjetivoStatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl px-4 py-3 text-center`}>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-[0.7px] text-secondary mt-1">{label}</p>
    </div>
  );
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
}
