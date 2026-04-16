import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Thermometer, TrendingUp, TrendingDown, Minus, MessageSquare } from "lucide-react";

function scoreColor(s: number) {
  if (s >= 8) return "text-accent";
  if (s >= 6) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(s: number) {
  if (s >= 8) return "bg-accent";
  if (s >= 6) return "bg-yellow-400";
  return "bg-red-400";
}

function fmtSemana(fecha: string) {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default async function TemperaturaRRHHPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("user_id", user.id)
    .single();
  if (!me) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch all data
  const [{ data: respuestas }, { data: areas }, { data: empleados }] =
    await Promise.all([
      db
        .from("respuestas_temperatura")
        .select("id, empleado_id, puntuacion, comentario, semana, created_at")
        .eq("empresa_id", me.empresa_id)
        .order("semana", { ascending: false })
        .limit(300),
      supabase
        .from("areas")
        .select("id, nombre")
        .eq("empresa_id", me.empresa_id)
        .order("nombre"),
      supabase
        .from("empleados")
        .select("id, area_id")
        .eq("empresa_id", me.empresa_id)
        .eq("activo", true),
    ]);

  type RespTemp = {
    id: string;
    empleado_id: string;
    puntuacion: number;
    comentario: string | null;
    semana: string;
    created_at: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp: RespTemp[] = (respuestas as any) ?? [];

  const totalResp = resp.length;
  const promGlobal =
    totalResp > 0
      ? (resp.reduce((acc, r) => acc + r.puntuacion, 0) / totalResp).toFixed(1)
      : null;

  // Map empleado → area
  const empAreaMap: Record<string, string> = {};
  (empleados ?? []).forEach((e) => {
    if (e.area_id) empAreaMap[e.id] = e.area_id;
  });

  const areaNombreMap: Record<string, string> = {};
  (areas ?? []).forEach((a) => {
    areaNombreMap[a.id] = a.nombre;
  });

  // Desglose por área
  const porArea: Record<string, number[]> = {};
  resp.forEach((r) => {
    const areaId = empAreaMap[r.empleado_id];
    if (!areaId) return;
    if (!porArea[areaId]) porArea[areaId] = [];
    porArea[areaId].push(r.puntuacion);
  });

  const desgloseAreas = Object.entries(porArea)
    .map(([areaId, scores]) => {
      const prev = resp
        .filter((r) => empAreaMap[r.empleado_id] === areaId)
        .slice(0, 20);
      const mitad = Math.floor(prev.length / 2);
      const reciente =
        mitad > 0
          ? prev.slice(0, mitad).reduce((a, b) => a + b.puntuacion, 0) /
            mitad
          : null;
      const anterior =
        mitad > 0
          ? prev.slice(mitad).reduce((a, b) => a + b.puntuacion, 0) /
            (prev.length - mitad)
          : null;
      const tendencia =
        reciente === null || anterior === null
          ? "flat"
          : reciente > anterior + 0.3
          ? "up"
          : reciente < anterior - 0.3
          ? "down"
          : "flat";
      return {
        nombre: areaNombreMap[areaId] ?? "—",
        promedio: (
          scores.reduce((a, b) => a + b, 0) / scores.length
        ).toFixed(1),
        total: scores.length,
        tendencia,
      };
    })
    .sort((a, b) => Number(b.promedio) - Number(a.promedio));

  // Evolución últimas 4 semanas
  const semanas = [
    ...new Set(resp.map((r) => r.semana)),
  ]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 4);

  const evolucion = semanas.map((sem) => {
    const semanResp = resp.filter((r) => r.semana === sem);
    const prom =
      semanResp.length > 0
        ? (
            semanResp.reduce((acc, r) => acc + r.puntuacion, 0) /
            semanResp.length
          ).toFixed(1)
        : null;
    return { semana: sem, prom, total: semanResp.length };
  });

  // Comentarios anónimos recientes (sin identificación de empleado)
  const comentarios = resp
    .filter((r) => r.comentario && r.comentario.trim())
    .slice(0, 8)
    .map((r) => ({ texto: r.comentario!, puntuacion: r.puntuacion, semana: r.semana }));

  const participantes = new Set(resp.map((r) => r.empleado_id)).size;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Temperatura del equipo</h1>
          <p className="text-secondary text-sm">
            Engagement y clima laboral · {totalResp} respuestas
          </p>
        </div>
      </div>

      {/* Score global */}
      <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-6 mb-6">
        {totalResp === 0 ? (
          <p className="text-sm text-secondary/60 text-center py-2">
            Aún no hay respuestas de temperatura. Las encuestas se responden
            desde el panel del empleado.
          </p>
        ) : (
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.7px] text-secondary mb-1">
                Score global
              </p>
              <span
                className={`text-[36px] font-extrabold leading-none ${
                  promGlobal ? scoreColor(Number(promGlobal)) : "text-secondary"
                }`}
              >
                {promGlobal ?? "—"}
              </span>
              <p className="text-xs text-secondary mt-1">/ 10</p>
            </div>
            <div className="h-16 w-px bg-[#1A2235]" />
            <div className="flex-1 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-[0.7px] text-secondary mb-1">
                  Participantes
                </p>
                <p className="text-[22px] font-extrabold text-accent">
                  {participantes}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.7px] text-secondary mb-1">
                  Respuestas totales
                </p>
                <p className="text-[22px] font-extrabold text-white">
                  {totalResp}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalResp > 0 && (
        <>
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Por área */}
            <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Thermometer size={15} className="text-accent" />
                <h2 className="text-sm font-semibold">Por área</h2>
              </div>
              {desgloseAreas.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-secondary/60">
                  Sin desglose por área disponible.
                </div>
              ) : (
                <div className="divide-y divide-[#1A2235]">
                  {desgloseAreas.map((a) => {
                    const TrendIcon =
                      a.tendencia === "up"
                        ? TrendingUp
                        : a.tendencia === "down"
                        ? TrendingDown
                        : Minus;
                    const trendColor =
                      a.tendencia === "up"
                        ? "text-accent"
                        : a.tendencia === "down"
                        ? "text-red-400"
                        : "text-secondary";
                    return (
                      <div
                        key={a.nombre}
                        className="flex items-center px-5 py-3 gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{a.nombre}</p>
                          <p className="text-xs text-secondary">
                            {a.total} respuesta{a.total !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="w-20 h-1.5 bg-border/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${scoreBg(Number(a.promedio))}`}
                            style={{
                              width: `${Number(a.promedio) * 10}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-sm font-bold w-8 text-right ${scoreColor(Number(a.promedio))}`}
                        >
                          {a.promedio}
                        </span>
                        <TrendIcon size={14} className={trendColor} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Evolución */}
            <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <TrendingUp size={15} className="text-accent" />
                <h2 className="text-sm font-semibold">
                  Evolución (últimas 4 semanas)
                </h2>
              </div>
              {evolucion.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-secondary/60">
                  Sin datos de semanas.
                </div>
              ) : (
                <div className="divide-y divide-[#1A2235]">
                  {evolucion.map((ev, i) => (
                    <div
                      key={ev.semana}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <p className="text-xs font-medium">
                          Semana del {fmtSemana(ev.semana)}
                        </p>
                        <p className="text-[10px] text-secondary/50">
                          {ev.total} respuesta{ev.total !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {i > 0 &&
                          evolucion[i - 1].prom &&
                          ev.prom && (
                            <span
                              className={`text-[10px] ${
                                Number(ev.prom) >=
                                Number(evolucion[i - 1].prom)
                                  ? "text-accent"
                                  : "text-red-400"
                              }`}
                            >
                              {Number(ev.prom) >=
                              Number(evolucion[i - 1].prom)
                                ? "↑"
                                : "↓"}
                            </span>
                          )}
                        <span
                          className={`text-sm font-bold ${
                            ev.prom
                              ? scoreColor(Number(ev.prom))
                              : "text-secondary"
                          }`}
                        >
                          {ev.prom ?? "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comentarios anónimos */}
          {comentarios.length > 0 && (
            <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <MessageSquare size={15} className="text-secondary" />
                <h2 className="text-sm font-semibold">
                  Comentarios anónimos
                </h2>
                <p className="ml-auto text-[10px] text-secondary/50">
                  Sin identificación de empleado
                </p>
              </div>
              <div className="divide-y divide-[#1A2235]">
                {comentarios.map((c, i) => (
                  <div key={i} className="px-5 py-3">
                    <p className="text-sm text-secondary leading-relaxed">
                      &ldquo;{c.texto}&rdquo;
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-secondary/40">
                        Semana del {fmtSemana(c.semana)}
                      </p>
                      <span
                        className={`text-[10px] font-bold ${scoreColor(c.puntuacion)}`}
                      >
                        {c.puntuacion}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
