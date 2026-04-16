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

async function buildContext(empresaId: string) {
  const admin  = createAdminClient();
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [
    { data: empresa },
    { data: areas },
    { data: empleados },
    { data: registros },
    { data: objetivos },
    { data: solAusencias },
    { data: solRetiros },
    { data: solVacaciones },
    { data: temperatura },
    { data: grupos },
  ] = await Promise.all([
    admin.from("empresas").select("nombre").eq("id", empresaId).single(),
    admin.from("areas").select("id, nombre").eq("empresa_id", empresaId),
    admin.from("empleados").select("id, nombre, rol, area_id, modalidad, activo, horas_laborables, banco_horas_ajuste").eq("empresa_id", empresaId).eq("activo", true),
    admin.from("registros_asistencia").select("empleado_id, fecha, tipo, metodo, hora_entrada, hora_salida").in("empleado_id",
      (await admin.from("empleados").select("id").eq("empresa_id", empresaId)).data?.map((e) => e.id) ?? []
    ).gte("fecha", hace30).order("fecha", { ascending: false }),
    admin.from("objetivos").select("id, titulo, progreso, estado, vencimiento, categoria, empleado_id").in("empleado_id",
      (await admin.from("empleados").select("id").eq("empresa_id", empresaId)).data?.map((e) => e.id) ?? []
    ),
    admin.from("solicitudes_ausencia").select("empleado_id, estado, fecha, subtipo, motivo").in("empleado_id",
      (await admin.from("empleados").select("id").eq("empresa_id", empresaId)).data?.map((e) => e.id) ?? []
    ).eq("estado", "pendiente"),
    admin.from("solicitudes_retiro").select("empleado_id, estado, fecha, hora_retiro, motivo").in("empleado_id",
      (await admin.from("empleados").select("id").eq("empresa_id", empresaId)).data?.map((e) => e.id) ?? []
    ).eq("estado", "pendiente"),
    admin.from("solicitudes_vacaciones").select("empleado_id, estado, fecha_desde, fecha_hasta, dias").in("empleado_id",
      (await admin.from("empleados").select("id").eq("empresa_id", empresaId)).data?.map((e) => e.id) ?? []
    ).eq("estado", "pendiente"),
    admin.from("respuestas_temperatura").select("empleado_id, puntuacion, comentario, created_at").in("empleado_id",
      (await admin.from("empleados").select("id").eq("empresa_id", empresaId)).data?.map((e) => e.id) ?? []
    ).order("created_at", { ascending: false }).limit(50),
    admin.from("grupos").select("id, nombre, area_id, grupos_miembros(count)").eq("empresa_id", empresaId),
  ]);

  // Maps
  const empMap: Record<string, string> = {};
  empleados?.forEach((e) => { empMap[e.id] = e.nombre; });

  const areaNombreMap: Record<string, string> = {};
  areas?.forEach((a) => { areaNombreMap[a.id] = a.nombre; });

  // Banco de horas por empleado
  const bancoMap: Record<string, number> = {};
  empleados?.forEach((e) => {
    const hl   = (e.horas_laborables ?? 8) * 60;
    const regs = (registros ?? []).filter((r) => r.empleado_id === e.id && r.hora_entrada && r.hora_salida);
    const saldo = regs.reduce((acc, r) => acc + (horaAMinutos(r.hora_salida!) - horaAMinutos(r.hora_entrada!) - hl), 0);
    bancoMap[e.id] = saldo + (e.banco_horas_ajuste ?? 0);
  });

  // Temperatura promedio global
  const tempScores    = (temperatura ?? []).map((t) => t.puntuacion);
  const tempPromedio  = tempScores.length > 0 ? (tempScores.reduce((a, b) => a + b, 0) / tempScores.length).toFixed(1) : null;

  // Temperatura por área
  const tempPorArea: Record<string, number[]> = {};
  (temperatura ?? []).forEach((t) => {
    const emp = empleados?.find((e) => e.id === t.empleado_id);
    if (emp?.area_id) {
      if (!tempPorArea[emp.area_id]) tempPorArea[emp.area_id] = [];
      tempPorArea[emp.area_id].push(t.puntuacion);
    }
  });

  return {
    empresa:     empresa?.nombre ?? "—",
    resumenAreas: (areas ?? []).map((a) => {
      const empsArea   = (empleados ?? []).filter((e) => e.area_id === a.id);
      const tempArr    = tempPorArea[a.id] ?? [];
      const tempAvg    = tempArr.length > 0 ? (tempArr.reduce((x, y) => x + y, 0) / tempArr.length).toFixed(1) : null;
      const pendientes = [
        ...(solAusencias  ?? []).filter((s) => empsArea.some((e) => e.id === s.empleado_id)),
        ...(solRetiros    ?? []).filter((s) => empsArea.some((e) => e.id === s.empleado_id)),
        ...(solVacaciones ?? []).filter((s) => empsArea.some((e) => e.id === s.empleado_id)),
      ].length;
      return {
        nombre:            a.nombre,
        totalEmpleados:    empsArea.length,
        temperaturaPromedio: tempAvg ? Number(tempAvg) : null,
        solicitudesPendientes: pendientes,
      };
    }),
    empleados: (empleados ?? []).map((e) => ({
      nombre:    e.nombre,
      rol:       e.rol,
      area:      e.area_id ? (areaNombreMap[e.area_id] ?? "—") : "—",
      modalidad: e.modalidad,
      bancoHoras: minutosAHorasStr(bancoMap[e.id] ?? 0),
    })),
    objetivos: (objetivos ?? []).map((o) => ({
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
    temperatura: {
      promedioGlobal: tempPromedio ? Number(tempPromedio) : null,
      totalRespuestas: tempScores.length,
    },
    grupos: (grupos ?? []).map((g) => ({
      nombre:   g.nombre,
      area:     g.area_id ? (areaNombreMap[g.area_id] ?? "—") : "—",
      miembros: (g.grupos_miembros as unknown as { count: number }[])?.[0]?.count ?? 0,
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { messages, empresaId } = await req.json() as {
      messages:  Message[];
      empresaId: string;
    };

    if (!empresaId) {
      return NextResponse.json({ error: "Falta empresaId" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
    }

    const ctx     = await buildContext(empresaId);
    const ctxJson = JSON.stringify(ctx, null, 2);

    const systemPrompt = `Sos Nexio AI, el asistente inteligente del gerente general de ${ctx.empresa}. Tenés acceso a los siguientes datos reales y actualizados de toda la empresa:

${ctxJson}

Respondé preguntas sobre empleados, áreas, objetivos, solicitudes, banco de horas y clima organizacional. Sé conciso y profesional. Podés hacer comparaciones entre áreas, identificar tendencias y alertar sobre situaciones críticas. No inventes datos que no estén en el contexto provisto. Si no tenés información sobre algo, decílo claramente. Respondé siempre en español rioplatense.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-5",
        max_tokens: 1200,
        system:     systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return NextResponse.json({ error: errText }, { status: anthropicRes.status });
    }

    const data    = await anthropicRes.json();
    const content = data.content?.[0]?.text ?? "";
    return NextResponse.json({ content });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
