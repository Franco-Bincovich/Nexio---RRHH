import ProximamenteButton from "@/components/ProximamenteButton";
import { BookOpen, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const capacitaciones = [
  {
    titulo: "Liderazgo situacional",
    descripcion: "Aprendé a adaptar tu estilo de liderazgo según la madurez del equipo y la situación.",
    duracion: "3h",
    progreso: 100,
    categoria: "Liderazgo",
    obligatoria: true,
  },
  {
    titulo: "Gestión de conflictos",
    descripcion: "Técnicas para identificar, mediar y resolver conflictos dentro del equipo.",
    duracion: "2h",
    progreso: 60,
    categoria: "Habilidades",
    obligatoria: true,
  },
  {
    titulo: "Feedback efectivo",
    descripcion: "Cómo dar y recibir retroalimentación constructiva que impulse el desarrollo.",
    duracion: "1h 30m",
    progreso: 0,
    categoria: "Comunicación",
    obligatoria: false,
  },
  {
    titulo: "OKRs para equipos",
    descripcion: "Metodología de objetivos y resultados clave aplicada a la gestión de equipos.",
    duracion: "2h 30m",
    progreso: 0,
    categoria: "Gestión",
    obligatoria: false,
  },
];

const CATEGORIA_COLOR: Record<string, string> = {
  Liderazgo:    "bg-blue-500/10 text-blue-400",
  Habilidades:  "bg-purple-500/10 text-purple-400",
  Comunicación: "bg-yellow-500/10 text-yellow-400",
  Gestión:      "bg-accent/10 text-accent",
};

export default function CapacitacionesPage() {
  const completadas = capacitaciones.filter((c) => c.progreso === 100).length;
  const pendientes  = capacitaciones.filter((c) => c.progreso === 0 && c.obligatoria).length;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Capacitaciones</h1>
          <p className="text-secondary text-sm">
            {completadas} de {capacitaciones.length} completadas
          </p>
        </div>
        <ProximamenteButton label="Ver catálogo" />
      </div>

      {pendientes > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          Tenés {pendientes} capacitación{pendientes > 1 ? "es" : ""} obligatoria{pendientes > 1 ? "s" : ""} pendiente{pendientes > 1 ? "s" : ""}.
        </div>
      )}

      <div className="space-y-4">
        {capacitaciones.map((cap, i) => (
          <div key={i} className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen size={16} className="text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{cap.titulo}</h3>
                    {cap.obligatoria && (
                      <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium">
                        OBLIGATORIA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1">{cap.descripcion}</p>
                </div>
              </div>

              {cap.progreso === 100 ? (
                <span className="flex items-center gap-1 text-xs text-accent flex-shrink-0">
                  <CheckCircle2 size={14} />
                  Completada
                </span>
              ) : (
                <ProximamenteButton
                  label={cap.progreso > 0 ? "Continuar" : "Inscribirse"}
                  className="text-xs py-1 px-3 flex-shrink-0"
                />
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs text-secondary mb-1.5">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {cap.duracion}
                </span>
                <span>{cap.progreso}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${cap.progreso}%`,
                    backgroundColor: "#3ECFB2",
                    opacity: cap.progreso === 100 ? 1 : 0.6,
                  }}
                />
              </div>
            </div>

            <div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  CATEGORIA_COLOR[cap.categoria] ?? "bg-white/5 text-gray-400"
                }`}
              >
                {cap.categoria}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
