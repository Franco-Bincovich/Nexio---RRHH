import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { Thermometer, Users, TrendingUp } from "lucide-react";
import TemperaturaExportBtn, { type TemperaturaRow } from "@/app/dashboard/rrhh/temperatura/TemperaturaExportBtn";

function puntajeBg(prom: number) {
  if (prom >= 8) return "text-accent";
  if (prom >= 6) return "text-yellow-400";
  return "text-red-400";
}

function fmtSemana(fecha: string) {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default async function TemperaturaGerentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user.id)
    .single();

  if (!gerente) redirect("/login");

  const admin = createAdminClient();

  const [{ data: respuestas }, { data: areas }, { data: empleados }] = await Promise.all([
    admin
      .from("respuestas_temperatura")
      .select("id, empleado_id, puntuacion, comentario, semana, created_at")
      .eq("empresa_id", gerente.empresa_id)
      .order("semana", { ascending: false })
      .limit(200),
    admin.from("areas").select("id, nombre").eq("empresa_id", gerente.empresa_id),
    admin.from("empleados").select("id, nombre, area_id").eq("empresa_id", gerente.empresa_id),
  ]);

  const totalResp = respuestas?.length ?? 0;
  const promGlobal = totalResp > 0
    ? ((respuestas ?? []).reduce((acc, r) => acc + r.puntuacion, 0) / totalResp).toFixed(1)
    : null;

  // Map empleado → area + nombre
  const empAreaMap: Record<string, string> = {};
  const empNombreMap: Record<string, string> = {};
  (empleados ?? []).forEach((e) => {
    if (e.area_id) empAreaMap[e.id] = e.area_id;
    empNombreMap[e.id] = e.nombre;
  });

  // Área map
  const areaNombreMap: Record<string, string> = {};
  (areas ?? []).forEach((a) => { areaNombreMap[a.id] = a.nombre; });

  // Desglose por área
  const porArea: Record<string, number[]> = {};
  (respuestas ?? []).forEach((r) => {
    const areaId = empAreaMap[r.empleado_id];
    if (!areaId) return;
    if (!porArea[areaId]) porArea[areaId] = [];
    porArea[areaId].push(r.puntuacion);
  });

  const desgloseAreas = Object.entries(porArea).map(([areaId, scores]) => ({
    nombre:   areaNombreMap[areaId] ?? "—",
    promedio: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    total:    scores.length,
  })).sort((a, b) => Number(b.promedio) - Number(a.promedio));

  // Evolución últimas 4 semanas
  const semanas = [...new Set((respuestas ?? []).map((r) => r.semana))].sort((a, b) => b.localeCompare(a)).slice(0, 4);
  const evolucion = semanas.map((sem) => {
    const resp = (respuestas ?? []).filter((r) => r.semana === sem);
    const prom = resp.length > 0 ? (resp.reduce((acc, r) => acc + r.puntuacion, 0) / resp.length).toFixed(1) : null;
    return { semana: sem, prom, total: resp.length };
  });

  // Comentarios anónimos recientes
  const comentarios = (respuestas ?? [])
    .filter((r) => r.comentario && r.comentario.trim())
    .slice(0, 8)
    .map((r) => ({ texto: r.comentario!, fecha: r.semana }));

  // Total participantes únicos
  const participantes = new Set((respuestas ?? []).map((r) => r.empleado_id)).size;

  const exportRows: TemperaturaRow[] = (respuestas ?? []).map((r) => ({
    empleado:   empNombreMap[r.empleado_id] ?? "—",
    area:       areaNombreMap[empAreaMap[r.empleado_id] ?? ""] ?? "—",
    semana:     r.semana,
    puntuacion: r.puntuacion,
    comentario: r.comentario ?? "",
  }));

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Temperatura del equipo</h1>
          <p className="text-secondary text-sm">Bienestar laboral de toda la empresa</p>
        </div>
        <TemperaturaExportBtn rows={exportRows} empresaLabel="empresa" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="col-span-1 bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Thermometer size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-0.5">Promedio global</p>
            <p className={`text-[28px] font-extrabold leading-none ${promGlobal ? puntajeBg(Number(promGlobal)) : "text-secondary"}`}>
              {promGlobal ?? "—"}
            </p>
            <p className="text-[10px] text-secondary/50 mt-0.5">sobre 10</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Participantes únicos</p>
          <p className="text-[22px] font-extrabold text-accent">{participantes}</p>
        </div>
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Respuestas totales</p>
          <p className="text-[22px] font-extrabold text-white">{totalResp}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Desglose por área */}
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
            <Users size={15} className="text-accent" />
            <h2 className="text-sm font-semibold">Promedio por área</h2>
          </div>
          {desgloseAreas.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-secondary/60">Sin respuestas aún.</div>
          ) : (
            <div className="divide-y divide-[#1A2235]">
              {desgloseAreas.map((area) => (
                <div key={area.nombre} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{area.nombre}</p>
                    <p className="text-[10px] text-secondary/50">{area.total} respuesta{area.total !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${puntajeBg(Number(area.promedio)).replace("text-", "bg-")}`}
                        style={{ width: `${Number(area.promedio) * 10}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${puntajeBg(Number(area.promedio))}`}>
                      {area.promedio}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evolución últimas 4 semanas */}
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
            <TrendingUp size={15} className="text-accent" />
            <h2 className="text-sm font-semibold">Evolución (últimas 4 semanas)</h2>
          </div>
          {evolucion.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-secondary/60">Sin datos de semanas.</div>
          ) : (
            <div className="divide-y divide-[#1A2235]">
              {evolucion.map((ev, i) => (
                <div key={ev.semana} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-xs font-medium">Semana del {fmtSemana(ev.semana)}</p>
                    <p className="text-[10px] text-secondary/50">{ev.total} respuesta{ev.total !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {i > 0 && evolucion[i - 1].prom && ev.prom && (
                      <span className={`text-[10px] ${Number(ev.prom) >= Number(evolucion[i - 1].prom) ? "text-accent" : "text-red-400"}`}>
                        {Number(ev.prom) >= Number(evolucion[i - 1].prom) ? "↑" : "↓"}
                      </span>
                    )}
                    <span className={`text-sm font-bold ${ev.prom ? puntajeBg(Number(ev.prom)) : "text-secondary"}`}>
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
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1A2235]">
            <h2 className="text-sm font-semibold">Comentarios recientes</h2>
            <p className="text-[10px] text-secondary/50 mt-0.5">Anónimos — sin identificación de empleado</p>
          </div>
          <div className="divide-y divide-[#1A2235]">
            {comentarios.map((c, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-sm text-secondary leading-relaxed">"{c.texto}"</p>
                <p className="text-[10px] text-secondary/40 mt-1">Semana del {fmtSemana(c.fecha)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
