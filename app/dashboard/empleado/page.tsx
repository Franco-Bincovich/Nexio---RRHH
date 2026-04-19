/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  Fingerprint, Clock, Umbrella, Target, Bell, User,
  CheckCircle2, XCircle, Home, ChevronRight, CalendarDays,
  MessageSquare, BookOpen, Thermometer,
} from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";

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

function primerNombre(nombre: string): string {
  return nombre.trim().split(" ")[0] ?? nombre;
}

function fmtFechaCorta(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

export default async function EmpleadoHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient() as any;

  // Empleado + empresa
  const { data: empleado } = await admin
    .from("empleados")
    .select("id, nombre, horas_laborables, banco_horas_ajuste, rol")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!empleado) redirect("/login");

  const empleadoId = empleado.id as string;
  const hoy = new Date().toISOString().split("T")[0];

  // Queries en paralelo
  const [
    { data: registrosHoy },
    { data: registrosCompletos },
    { data: proxVacaciones },
    { count: objetivosPendientes },
    { count: notifsSinLeer },
  ] = await Promise.all([
    admin
      .from("registros_asistencia")
      .select("tipo, metodo, hora_entrada, hora_salida")
      .eq("empleado_id", empleadoId)
      .eq("fecha", hoy),
    admin
      .from("registros_asistencia")
      .select("hora_entrada, hora_salida")
      .eq("empleado_id", empleadoId)
      .not("hora_entrada", "is", null)
      .not("hora_salida", "is", null)
      .limit(90),
    admin
      .from("solicitudes_vacaciones")
      .select("fecha_desde, fecha_hasta, dias")
      .eq("empleado_id", empleadoId)
      .eq("estado", "aprobada")
      .gte("fecha_desde", hoy)
      .order("fecha_desde", { ascending: true })
      .limit(1),
    admin
      .from("objetivos")
      .select("id", { count: "exact", head: true })
      .eq("empleado_id", empleadoId)
      .in("estado", ["pendiente", "en_progreso"]),
    admin
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("destinatario_id", empleadoId)
      .eq("leida", false),
  ]);

  // Estado de asistencia de hoy
  type EstadoAsist = "presente" | "home" | "ausente";
  let estadoHoy: EstadoAsist = "ausente";
  let horaEntrada: string | null = null;
  const entrada = ((registrosHoy ?? []) as any[]).find((r) => r.tipo === "entrada");
  if (entrada) {
    estadoHoy = entrada.metodo === "home" ? "home" : "presente";
    horaEntrada = (entrada.hora_entrada as string | null) ?? null;
  }

  // Banco de horas
  const horasLaborables = (empleado.horas_laborables ?? 8) * 60;
  const ajuste = (empleado.banco_horas_ajuste as number | null) ?? 0;
  const saldoBruto = ((registrosCompletos ?? []) as any[]).reduce((acc, r) => {
    const entr = r.hora_entrada as string | null;
    const sal = r.hora_salida as string | null;
    if (!entr || !sal) return acc;
    const min = horaAMinutos(sal) - horaAMinutos(entr);
    return acc + (min - horasLaborables);
  }, 0);
  const saldoTotal = saldoBruto + ajuste;

  const proxVac = ((proxVacaciones ?? []) as any[])[0] ?? null;

  const kpis = [
    {
      label: "Asistencia hoy",
      estadoBadge: estadoHoy,
      sub:
        estadoHoy === "presente"
          ? `Entrada ${horaEntrada?.slice(0, 5) ?? "—"}`
          : estadoHoy === "home"
            ? `Home · ${horaEntrada?.slice(0, 5) ?? "—"}`
            : "Sin registrar",
      icon: Fingerprint,
      href: "/dashboard/empleado/asistencia",
    },
    {
      label: "Banco de horas",
      value: minutosAHorasStr(saldoTotal),
      sub: "saldo actual",
      color:
        saldoTotal > 0 ? "text-accent" : saldoTotal < 0 ? "text-red-400" : "text-foreground",
      icon: Clock,
      href: "/dashboard/empleado/banco-horas",
    },
    {
      label: "Objetivos pendientes",
      value: String(objetivosPendientes ?? 0),
      sub: (objetivosPendientes ?? 0) === 1 ? "objetivo en curso" : "objetivos en curso",
      color: "text-blue-400",
      icon: Target,
      href: "/dashboard/empleado/objetivos",
    },
    {
      label: "Notificaciones",
      value: String(notifsSinLeer ?? 0),
      sub: (notifsSinLeer ?? 0) === 1 ? "sin leer" : "sin leer",
      color: (notifsSinLeer ?? 0) > 0 ? "text-yellow-400" : "text-secondary",
      icon: Bell,
      href: "/dashboard/empleado/notificaciones",
    },
  ];

  const accesosRapidos = [
    { label: "Mi perfil",    icon: User,         href: "/dashboard/empleado/perfil" },
    { label: "Vacaciones",   icon: Umbrella,     href: "/dashboard/empleado/vacaciones" },
    { label: "Asistencia",   icon: Fingerprint,  href: "/dashboard/empleado/asistencia" },
    { label: "Temperatura",  icon: Thermometer,  href: "/dashboard/empleado/temperatura" },
    { label: "Capacitaciones", icon: BookOpen,   href: "/dashboard/empleado/capacitaciones" },
    { label: "Foros",        icon: MessageSquare, href: "/dashboard/empleado/foro" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-6">
      <PageHeader
        titulo={`Hola, ${primerNombre(empleado.nombre)} 👋`}
        descripcion="Este es tu resumen del día en Nexio."
        className="mb-0"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group"
            >
              <Card className="h-full hover:border-accent/40 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={14} className="text-accent" />
                  <p className="text-[10px] uppercase tracking-[0.7px] text-secondary flex-1">
                    {kpi.label}
                  </p>
                  <ChevronRight size={12} className="text-secondary/40 group-hover:text-accent transition-colors" />
                </div>
                {"estadoBadge" in kpi && kpi.estadoBadge ? (
                  <div className="space-y-1">
                    <EstadoAsistenciaBadge estado={kpi.estadoBadge as EstadoAsist} />
                    <p className="text-[10px] text-secondary/60 mt-1">{kpi.sub}</p>
                  </div>
                ) : (
                  <>
                    <p className={`text-[22px] font-extrabold leading-none ${kpi.color ?? "text-foreground"}`}>
                      {kpi.value}
                    </p>
                    <p className="text-[10px] text-secondary/60 mt-1">{kpi.sub}</p>
                  </>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Próximas vacaciones */}
      <Card noPadding>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Umbrella size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Próximas vacaciones</h2>
          <Link
            href="/dashboard/empleado/vacaciones"
            className="ml-auto text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Ver todas →
          </Link>
        </div>
        {proxVac ? (
          <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={18} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {fmtFechaCorta(proxVac.fecha_desde)} → {fmtFechaCorta(proxVac.fecha_hasta)}
              </p>
              <p className="text-xs text-secondary/70">
                {proxVac.dias} día{proxVac.dias !== 1 ? "s" : ""} aprobados
              </p>
            </div>
            <Badge estado="aprobada" showIcon={false} />
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-secondary/70">
              No tenés vacaciones aprobadas próximas.
            </p>
            <Link
              href="/dashboard/empleado/vacaciones"
              className="text-xs text-accent hover:text-accent/80 transition-colors mt-1 inline-block"
            >
              Solicitar vacaciones →
            </Link>
          </div>
        )}
      </Card>

      {/* Accesos rápidos */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-3 px-1">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {accesosRapidos.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group"
              >
                <Card className="flex flex-col items-center justify-center gap-2 py-5 hover:border-accent/40 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Icon size={15} className="text-accent" />
                  </div>
                  <span className="text-xs text-center">{a.label}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EstadoAsistenciaBadge({ estado }: { estado: "presente" | "home" | "ausente" }) {
  if (estado === "presente") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-accent bg-accent/10 border border-accent/20 rounded-full px-2.5 py-1">
        <CheckCircle2 size={11} />
        Presente
      </span>
    );
  }
  if (estado === "home") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-2.5 py-1">
        <Home size={11} />
        Home office
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-secondary bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
      <XCircle size={11} />
      Ausente
    </span>
  );
}
