import ProximamenteButton from "@/components/ProximamenteButton";
import { BookOpen, Clock, CheckCircle2, AlertCircle, Library } from "lucide-react";

const misCapacitaciones = [
  {
    titulo: "Inducción Nexio",
    descripcion: "Conocé la cultura, los procesos y las herramientas de la empresa.",
    duracion: "2h",
    progreso: 100,
    categoria: "Onboarding",
    obligatoria: true,
  },
  {
    titulo: "Seguridad de la información",
    descripcion: "Buenas prácticas para proteger datos sensibles en el trabajo diario.",
    duracion: "1h 30m",
    progreso: 40,
    categoria: "Seguridad",
    obligatoria: true,
  },
  {
    titulo: "Comunicación efectiva",
    descripcion: "Técnicas para mejorar la comunicación escrita y oral en equipos remotos.",
    duracion: "3h",
    progreso: 0,
    categoria: "Soft Skills",
    obligatoria: false,
  },
  {
    titulo: "Excel para gestión de proyectos",
    descripcion: "Funciones avanzadas, tablas dinámicas y dashboards con Excel.",
    duracion: "4h",
    progreso: 0,
    categoria: "Herramientas",
    obligatoria: false,
  },
];

const catalogo = [
  {
    titulo: "Liderazgo situacional",
    descripcion: "Estrategias para adaptar el estilo de liderazgo según el contexto del equipo.",
    duracion: "5h",
    categoria: "Soft Skills",
  },
  {
    titulo: "Power BI para análisis de datos",
    descripcion: "Creación de dashboards interactivos y reportes automatizados.",
    duracion: "6h",
    categoria: "Herramientas",
  },
  {
    titulo: "Gestión del tiempo y productividad",
    descripcion: "Técnicas de priorización, GTD y gestión del foco en entornos híbridos.",
    duracion: "2h",
    categoria: "Soft Skills",
  },
  {
    titulo: "Primeros auxilios básicos",
    descripcion: "Capacitación obligatoria en primeros auxilios para el puesto de trabajo.",
    duracion: "3h",
    categoria: "Seguridad",
  },
  {
    titulo: "Normativa de RRHH 2025",
    descripcion: "Actualización sobre legislación laboral, licencias y acuerdos vigentes.",
    duracion: "1h",
    categoria: "Compliance",
  },
];

const CATEGORIA_COLOR: Record<string, string> = {
  Onboarding:   "bg-blue-500/10 text-blue-400",
  Seguridad:    "bg-red-500/10 text-red-400",
  "Soft Skills": "bg-purple-500/10 text-purple-400",
  Herramientas: "bg-yellow-500/10 text-yellow-400",
  Compliance:   "bg-orange-500/10 text-orange-400",
};

export default function CapacitacionesPage() {
  const completadas = misCapacitaciones.filter((c) => c.progreso === 100).length;
  const obligatoriasPendientes = misCapacitaciones.filter((c) => c.progreso === 0 && c.obligatoria).length;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Capacitaciones</h1>
      <p className="text-secondary text-sm mb-6">
        {completadas} de {misCapacitaciones.length} completadas
      </p>

      {obligatoriasPendientes > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          Tenés {obligatoriasPendientes} capacitación{obligatoriasPendientes > 1 ? "es" : ""} obligatoria{obligatoriasPendientes > 1 ? "s" : ""} pendiente{obligatoriasPendientes > 1 ? "s" : ""}.
        </div>
      )}

      {/* Sección 1: Mis capacitaciones */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={15} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.7px]">Mis capacitaciones</h2>
        </div>
        <div className="space-y-4">
          {misCapacitaciones.map((cap, i) => (
            <CapCard key={i} cap={cap} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-[10px] uppercase tracking-[0.9px] text-secondary/40">Catálogo disponible</span>
        <div className="flex-1 h-px bg-border/40" />
      </div>

      {/* Sección 2: Catálogo */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Library size={15} className="text-secondary" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.7px] text-secondary">Catálogo</h2>
          <span className="text-[10px] text-secondary/50 bg-white/5 px-2 py-0.5 rounded-full ml-1">
            {catalogo.length} disponibles
          </span>
        </div>
        <div className="space-y-3">
          {catalogo.map((cap, i) => (
            <div
              key={i}
              className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium truncate">{cap.titulo}</h3>
                </div>
                <p className="text-xs text-secondary/70 line-clamp-1">{cap.descripcion}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORIA_COLOR[cap.categoria] ?? "bg-white/5 text-secondary"}`}>
                    {cap.categoria}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-secondary/50">
                    <Clock size={10} />
                    {cap.duracion}
                  </span>
                </div>
              </div>
              <ProximamenteButton label="Postularme" className="text-xs py-1 px-3 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CapCard({ cap }: { cap: typeof misCapacitaciones[0] }) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
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
          <span className="flex items-center gap-1"><Clock size={11} />{cap.duracion}</span>
          <span>{cap.progreso}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-accent"
            style={{ width: `${cap.progreso}%`, opacity: cap.progreso === 100 ? 1 : 0.6 }}
          />
        </div>
      </div>
      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORIA_COLOR[cap.categoria] ?? "bg-white/5 text-secondary"}`}>
        {cap.categoria}
      </span>
    </div>
  );
}
