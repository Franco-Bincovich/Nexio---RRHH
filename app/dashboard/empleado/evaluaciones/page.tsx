import { FlaskConical, Star, CheckCircle2, Clock, Circle, ChevronRight } from "lucide-react";
import ProximamenteButton from "@/components/ProximamenteButton";

const evaluaciones = [
  {
    tipo: "Evaluación 360°",
    evaluador: "Equipo completo",
    fecha: "15 dic 2025",
    score: 4.2,
    estado: "completada",
  },
  {
    tipo: "Evaluación de desempeño",
    evaluador: "Ana Torres (Líder)",
    fecha: "30 jun 2025",
    score: 3.8,
    estado: "completada",
  },
  {
    tipo: "Evaluación semestral",
    evaluador: "RRHH",
    fecha: "15 mar 2026",
    score: null,
    estado: "pendiente",
  },
  {
    tipo: "Autoevaluación",
    evaluador: "Tú mismo",
    fecha: "01 abr 2026",
    score: null,
    estado: "pendiente",
  },
];

const proximas = [
  { tipo: "Evaluación 360°", estimada: "jun 2026" },
  { tipo: "Evaluación semestral", estimada: "jul 2026" },
];

const ESTADO_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  completada: { label: "Completada", icon: CheckCircle2, color: "text-accent",    bg: "bg-accent/10 border-accent/20" },
  pendiente:  { label: "Pendiente",  icon: Clock,       color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  en_curso:   { label: "En curso",   icon: Circle,      color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20" },
};

function Stars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= Math.round(score) ? "text-yellow-400 fill-yellow-400" : "text-secondary/30"}
        />
      ))}
      <span className="text-xs font-semibold ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

export default function EvaluacionesPage() {
  const completadas = evaluaciones.filter((e) => e.estado === "completada").length;
  const pendientes  = evaluaciones.filter((e) => e.estado === "pendiente").length;
  const scores      = evaluaciones.filter((e) => e.score !== null).map((e) => e.score as number);
  const promedio    = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Evaluaciones</h1>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
              <FlaskConical size={10} />
              Datos ilustrativos
            </span>
          </div>
          <p className="text-secondary text-sm">Tu historial de evaluaciones de desempeño</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Completadas</p>
          <p className="text-[22px] font-extrabold text-accent">{completadas}</p>
        </div>
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Pendientes</p>
          <p className="text-[22px] font-extrabold text-yellow-400">{pendientes}</p>
        </div>
        <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">Score promedio</p>
          {promedio !== null ? (
            <div className="mt-1"><Stars score={promedio} /></div>
          ) : (
            <p className="text-[22px] font-extrabold text-secondary">—</p>
          )}
        </div>
      </div>

      {/* Lista evaluaciones */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[#1A2235]">
          <h2 className="text-sm font-semibold">Historial</h2>
        </div>
        <ul className="divide-y divide-[#1A2235]">
          {evaluaciones.map((ev, i) => {
            const est = ESTADO_CONFIG[ev.estado] ?? ESTADO_CONFIG.pendiente;
            const EstIcon = est.icon;
            return (
              <li key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{ev.tipo}</p>
                    <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full border ${est.bg} ${est.color}`}>
                      <EstIcon size={9} />
                      {est.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-secondary/60">
                    <span>{ev.evaluador}</span>
                    <span>·</span>
                    <span>{ev.fecha}</span>
                  </div>
                  {ev.score !== null && (
                    <div className="mt-1.5">
                      <Stars score={ev.score} />
                    </div>
                  )}
                </div>
                <ProximamenteButton label="Ver detalle" className="text-xs py-1 px-3 flex-shrink-0" />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Próximas evaluaciones */}
      <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1A2235]">
          <h2 className="text-sm font-semibold">Próximas evaluaciones</h2>
        </div>
        <ul className="divide-y divide-[#1A2235]">
          {proximas.map((p, i) => (
            <li key={i} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                  <ChevronRight size={13} className="text-accent" />
                </div>
                <p className="text-sm">{p.tipo}</p>
              </div>
              <span className="text-xs text-secondary/60 bg-white/5 px-2.5 py-1 rounded-full">Est. {p.estimada}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
