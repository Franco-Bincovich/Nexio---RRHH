import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type Message = { role: "user" | "assistant"; content: string };

function horaAMinutos(hora: string): number {
  const [h, m, s] = hora.split(":").map(Number);
  return h * 60 + (m ?? 0) + Math.round((s ?? 0) / 60);
}

function minutosAHorasStr(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const abs  = Math.abs(min);
  const h    = Math.floor(abs / 60);
  const m    = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

async function buildContext(areaId: string, empresaId: string) {
  const admin = createAdminClient();
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [
    { data: empleados },
    { data: registros },
    { data: objetivos },
    { data: solAusencias },
    { data: solRetiros },
    { data: solVacaciones },
    { data: grupos },
    { data: temperatura },
    { data: area },
    { data: empresa },
  ] = await Promise.all([
    admin.from("empleados").select("id, nombre, rol, modalidad, activo, horas_laborables, banco_horas_ajuste").eq("area_id", areaId).eq("activo", true),
    admin.from("registros_asistencia").select("empleado_id, fecha, tipo, metodo, hora_entrada, hora_salida").in("empleado_id",
      (await admin.from("empleados").select("id").eq("area_id", areaId)).data?.map((e) => e.id) ?? []
    ).gte("fecha", hace30).order("fecha", { ascending: false }),
    admin.from("objetivos").select("id, titulo, descripcion, progreso, estado, vencimiento, categoria, empleado_id").in("empleado_id",
      (await admin.from("empleados").select("id").eq("area_id", areaId)).data?.map((e) => e.id) ?? []
    ),
    admin.from("solicitudes_ausencia").select("empleado_id, estado, fecha, subtipo, motivo").in("empleado_id",
      (await admin.from("empleados").select("id").eq("area_id", areaId)).data?.map((e) => e.id) ?? []
    ).eq("estado", "pendiente"),
    admin.from("solicitudes_retiro").select("empleado_id, estado, fecha, hora_retiro, motivo").in("empleado_id",
      (await admin.from("empleados").select("id").eq("area_id", areaId)).data?.map((e) => e.id) ?? []
    ).eq("estado", "pendiente"),
    admin.from("solicitudes_vacaciones").select("empleado_id, estado, fecha_desde, fecha_hasta, dias").in("empleado_id",
      (await admin.from("empleados").select("id").eq("area_id", areaId)).data?.map((e) => e.id) ?? []
    ).eq("estado", "pendiente"),
    admin.from("grupos").select("id, nombre, descripcion, grupos_miembros(count)").eq("area_id", areaId),
    admin.from("respuestas_temperatura").select("empleado_id, puntuacion, comentario, created_at").in("empleado_id",
      (await admin.from("empleados").select("id").eq("area_id", areaId)).data?.map((e) => e.id) ?? []
    ).order("created_at", { ascending: false }).limit(30),
    admin.from("areas").select("nombre").eq("id", areaId).single(),
    admin.from("empresas").select("nombre").eq("id", empresaId).single(),
  ]);

  // Mapa empleado id → nombre
  const empMap: Record<string, string> = {};
  empleados?.forEach((e) => { empMap[e.id] = e.nombre; });

  // Banco de horas por empleado
  const bancoMap: Record<string, number> = {};
  empleados?.forEach((e) => {
    const hl = (e.horas_laborables ?? 8) * 60;
    const regs = (registros ?? []).filter((r) => r.empleado_id === e.id && r.hora_entrada && r.hora_salida);
    const saldo = regs.reduce((acc, r) => acc + (horaAMinutos(r.hora_salida!) - horaAMinutos(r.hora_entrada!) - hl), 0);
    bancoMap[e.id] = saldo + (e.banco_horas_ajuste ?? 0);
  });

  // Asistencia últimos 30 días: resumen por fecha
  const asistenciaResumen: Record<string, { presentes: string[]; homeOffice: string[] }> = {};
  (registros ?? []).filter((r) => r.tipo === "entrada").forEach((r) => {
    if (!asistenciaResumen[r.fecha]) asistenciaResumen[r.fecha] = { presentes: [], homeOffice: [] };
    const nombre = empMap[r.empleado_id] ?? r.empleado_id;
    if (r.metodo === "home") asistenciaResumen[r.fecha].homeOffice.push(nombre);
    else                     asistenciaResumen[r.fecha].presentes.push(nombre);
  });

  // Temperatura promedio
  const tempScores = (temperatura ?? []).map((t) => t.puntuacion);
  const tempPromedio = tempScores.length > 0 ? (tempScores.reduce((a, b) => a + b, 0) / tempScores.length).toFixed(1) : null;

  return {
    area:        area?.nombre ?? "—",
    empresa:     empresa?.nombre ?? "—",
    empleados:   empleados?.map((e) => ({
      nombre:    e.nombre,
      rol:       e.rol,
      modalidad: e.modalidad,
      bancHoras: minutosAHorasStr(bancoMap[e.id] ?? 0),
    })),
    asistenciaUltimos30Dias: Object.entries(asistenciaResumen)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30)
      .map(([fecha, v]) => ({ fecha, presentes: v.presentes, homeOffice: v.homeOffice })),
    objetivos: objetivos?.map((o) => ({
      titulo:    o.titulo,
      empleado:  empMap[o.empleado_id] ?? "—",
      progreso:  `${o.progreso}%`,
      estado:    o.estado,
      vencimiento: o.vencimiento,
      categoria: o.categoria,
    })),
    solicitudesPendientes: {
      inasistencias: (solAusencias ?? []).map((s) => ({
        empleado: empMap[s.empleado_id] ?? "—", fecha: s.fecha, tipo: s.subtipo, motivo: s.motivo,
      })),
      retiros: (solRetiros ?? []).map((s) => ({
        empleado: empMap[s.empleado_id] ?? "—", fecha: s.fecha, hora: s.hora_retiro, motivo: s.motivo,
      })),
      vacaciones: (solVacaciones ?? []).map((s) => ({
        empleado: empMap[s.empleado_id] ?? "—", desde: s.fecha_desde, hasta: s.fecha_hasta, dias: s.dias,
      })),
    },
    grupos: grupos?.map((g) => ({
      nombre:   g.nombre,
      miembros: (g.grupos_miembros as unknown as { count: number }[])?.[0]?.count ?? 0,
    })),
    temperatura: {
      promedio:  tempPromedio ? Number(tempPromedio) : null,
      respuestas: (temperatura ?? []).slice(0, 10).map((t) => ({
        empleado:   empMap[t.empleado_id] ?? "—",
        puntuacion: t.puntuacion,
        comentario: t.comentario,
      })),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { messages, areaId, empresaId } = await req.json() as {
      messages:  Message[];
      areaId:    string;
      empresaId: string;
    };

    if (!areaId || !empresaId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
    }

    const ctx     = await buildContext(areaId, empresaId);
    const ctxJson = JSON.stringify(ctx, null, 2);

    const systemPrompt = `Sos Nexio AI, el asistente inteligente del área ${ctx.area} de ${ctx.empresa}. Tenés acceso a los siguientes datos reales y actualizados de tu área:

${ctxJson}

Respondé preguntas sobre el equipo, asistencia, objetivos, solicitudes y banco de horas. Sé conciso y profesional. No inventes datos que no estén en el contexto provisto. Si no tenés información sobre algo, decílo claramente. Respondé siempre en español rioplatense.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-5",
        max_tokens: 1000,
        system:     systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return NextResponse.json({ error: errText }, { status: anthropicRes.status });
    }

    const data = await anthropicRes.json();
    const content = data.content?.[0]?.text ?? "";
    return NextResponse.json({ content });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
