import { Sparkles, Lock } from "lucide-react";

type Props = {
  titulo: string;
  descripcion: string;
  icon: React.ElementType;
  accionesMock?: string[];
};

export default function ProximamenteView({ titulo, descripcion, icon: Icon, accionesMock }: Props) {
  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.6px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
          <Sparkles size={10} />
          En desarrollo
        </span>
      </div>
      <p className="text-secondary text-sm mb-8">{descripcion}</p>

      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-12 text-center border-b border-border">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Icon size={28} className="text-accent" />
          </div>
          <h2
            className="text-base font-semibold mb-1.5"
            style={{ color: "rgb(var(--color-foreground))" }}
          >
            Próximamente en Nexio
          </h2>
          <p
            className="text-sm max-w-md mx-auto leading-relaxed"
            style={{ color: "rgb(var(--color-foreground))" }}
          >
            Este módulo está en desarrollo. Vas a poder acceder a la funcionalidad completa en la próxima versión.
          </p>
        </div>

        {accionesMock && accionesMock.length > 0 && (
          <div className="px-6 py-5">
            <p
              className="text-[10px] uppercase tracking-[0.7px] mb-3"
              style={{ color: "rgb(var(--color-secondary))" }}
            >
              Acciones previstas
            </p>
            <div className="flex flex-wrap gap-2">
              {accionesMock.map((label) => (
                <button
                  key={label}
                  disabled
                  title="Disponible próximamente"
                  className="inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 text-secondary bg-white/[0.02]"
                >
                  <Lock size={11} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
