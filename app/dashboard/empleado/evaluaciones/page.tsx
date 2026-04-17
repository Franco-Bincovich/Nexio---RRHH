/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { Star, CheckCircle2, Clock, AlertCircle, ClipboardCheck } from "lucide-react";
import {
  CRITERIOS, decodeComentario, getCicloConfig, score1_10A1_5,
} from "@/lib/evaluaciones";

export default async function EvaluacionesEmpleadoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();
  if (!empleado) redirect("/login");

  const admin = createAdminClient();
  const ciclo = await getCicloConfig(admin, empleado.empresa_id);

  const { data: evsRaw } = await (admin as any)
    .from("evaluaciones")
    .select("id, puntuacion, comentario, estado, created_at, evaluador_id")
    .eq("empleado_id", empleado.id)
    .eq("tipo", "desempeño")
    .eq("estado", "completada")
    .order("created_at", { ascending: false });

  const evaluadorIds = Array.from(new Set(((evsRaw ?? []) as any[]).map((e) => e.evaluador_id).filter(Boolean)));
  const evaluadorMap: Record<string, string> = {};
  if (evaluadorIds.length > 0) {
    const { data: evs } = await admin
      .from("empleados")
      .select("id, nombre")
      .in("id", evaluadorIds);
    (evs ?? []).forEach((e) => { evaluadorMap[e.id] = e.nombre; });
  }

  const evaluaciones = ((evsRaw ?? []) as any[]).map((e) => {
    const dec = decodeComentario(e.comentario);
    return {
      id: e.id as string,
      promedio5: e.puntuacion != null ? score1_10A1_5(e.puntuacion) : null,
      criterios: dec.criterios,
      texto: dec.texto,
      created_at: e.created_at as string,
      evaluador: e.evaluador_id ? evaluadorMap[e.evaluador_id] ?? null : null,
    };
  });

  const tienePeriodoActual = ciclo.evaluaciones_activas_desde
    ? evaluaciones.some((e) => new Date(e.created_at) >= new Date(ciclo.evaluaciones_activas_desde!))
    : evaluaciones.length > 0;

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Evaluaciones</h1>
        <p className="text-secondary text-sm">Tu historial de evaluaciones de desempeño</p>
      </div>

      {/* Estado del ciclo */}
      {ciclo.evaluaciones_activas && !tienePeriodoActual && (
        <div className="flex items-center gap-3 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm">
          <Clock size={15} />
          Tu evaluación está pendiente
        </div>
      )}
      {!ciclo.evaluaciones_activas && evaluaciones.length === 0 && (
        <div className="flex items-center gap-3 text-secondary/80 bg-white/[0.02] border border-[#1A2235] rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={15} />
          No hay período de evaluación activo
        </div>
      )}

      {/* Historial */}
      {evaluaciones.length === 0 ? (
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] py-16 text-center">
          <ClipboardCheck size={28} className="text-secondary/25 mx-auto mb-3" />
          <p className="text-sm text-secondary/60">No tenés evaluaciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {evaluaciones.map((ev) => (
            <div key={ev.id} className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-accent" />
                    <p className="text-sm font-semibold">Evaluación de desempeño</p>
                  </div>
                  <p className="text-xs text-secondary/70 mt-0.5">
                    {new Date(ev.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                    {ev.evaluador ? ` · Evaluada por ${ev.evaluador}` : ""}
                  </p>
                </div>
                {ev.promedio5 !== null && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-accent">
                      <Star size={14} className="fill-accent" />
                      <span className="text-lg font-bold">{ev.promedio5.toFixed(2)}</span>
                      <span className="text-xs text-secondary/60">/ 5</span>
                    </div>
                    <p className="text-[10px] uppercase tracking-wide text-secondary/50">Promedio</p>
                  </div>
                )}
              </div>

              {ev.criterios && (
                <div className="grid sm:grid-cols-2 gap-2 mb-3">
                  {CRITERIOS.map((c) => {
                    const v = ev.criterios?.[c.key] ?? 0;
                    return (
                      <div
                        key={c.key}
                        className="flex items-center justify-between bg-white/[0.02] border border-[#1A2235] rounded-lg px-3 py-2"
                      >
                        <span className="text-xs text-secondary">{c.label}</span>
                        <span className="flex items-center gap-1 text-xs font-semibold">
                          <Star size={11} className="text-yellow-400 fill-yellow-400" />
                          {v}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {ev.texto && (
                <div className="bg-white/[0.02] border border-[#1A2235] rounded-lg px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-secondary/60 mb-1">Comentario</p>
                  <p className="text-xs text-secondary">{ev.texto}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
