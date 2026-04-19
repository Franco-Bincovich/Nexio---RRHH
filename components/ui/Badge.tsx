import type { ElementType } from "react";
import {
  Clock, CheckCircle2, XCircle, Loader, Archive, CircleCheck,
  Building2, Wifi, Home,
} from "lucide-react";

type BadgeStyle = {
  label: string;
  text: string;
  bg: string;
  border: string;
  icon?: ElementType;
};

/**
 * Mapeo central de estados a estilo visual.
 * Si agregás un estado nuevo en el dominio, agregarlo acá y usar <Badge estado="..." />.
 */
export const BADGE_CONFIG: Record<string, BadgeStyle> = {
  // Solicitudes (ausencia, retiro, vacaciones)
  pendiente:   { label: "Pendiente",   text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", icon: Clock },
  aprobada:    { label: "Aprobada",    text: "text-accent",     bg: "bg-accent/10",     border: "border-accent/20",     icon: CheckCircle2 },
  rechazada:   { label: "Rechazada",   text: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/20",    icon: XCircle },

  // Objetivos / evaluaciones
  completado:  { label: "Completado",  text: "text-accent",     bg: "bg-accent/10",     border: "border-accent/20",     icon: CheckCircle2 },
  completada:  { label: "Completada",  text: "text-accent",     bg: "bg-accent/10",     border: "border-accent/20",     icon: CheckCircle2 },
  en_progreso: { label: "En progreso", text: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/20",   icon: Loader },
  en_curso:    { label: "En curso",    text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", icon: Loader },
  cancelado:   { label: "Cancelado",   text: "text-secondary",  bg: "bg-white/5",       border: "border-white/10",      icon: XCircle },

  // Capacitaciones
  activa:      { label: "Activa",      text: "text-accent",     bg: "bg-accent/10",     border: "border-accent/20",     icon: CircleCheck },
  archivada:   { label: "Archivada",   text: "text-secondary",  bg: "bg-white/5",       border: "border-white/10",      icon: Archive },

  // Modalidad
  presencial:  { label: "Presencial",  text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20", icon: Building2 },
  remoto:      { label: "Remoto",      text: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/20",   icon: Wifi },
  hibrido:     { label: "Híbrido",     text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", icon: Home },

  // Método de asistencia
  home:        { label: "Home",        text: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/20",   icon: Home },
};

type Size = "sm" | "md";

const SIZE_CLASS: Record<Size, { wrapper: string; icon: number }> = {
  sm: { wrapper: "text-[10px] px-2 py-0.5",   icon: 10 },
  md: { wrapper: "text-xs px-2.5 py-1",        icon: 12 },
};

type Props = {
  estado: string;
  /** Label custom; si no se pasa, se usa BADGE_CONFIG[estado].label */
  label?: string;
  size?: Size;
  showIcon?: boolean;
  /** Ícono custom que override el default del estado */
  icon?: ElementType;
  className?: string;
};

export default function Badge({
  estado,
  label,
  size = "sm",
  showIcon = true,
  icon,
  className = "",
}: Props) {
  const cfg = BADGE_CONFIG[estado];
  if (!cfg) {
    // Fallback neutral si el estado no está en el config
    return (
      <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-[0.5px] rounded-full border ${SIZE_CLASS[size].wrapper} text-secondary bg-white/5 border-white/10 ${className}`}>
        {label ?? estado}
      </span>
    );
  }
  const Icon = icon ?? cfg.icon;
  const sz = SIZE_CLASS[size];
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-[0.5px] rounded-full border ${sz.wrapper} ${cfg.text} ${cfg.bg} ${cfg.border} ${className}`}
    >
      {showIcon && Icon && <Icon size={sz.icon} />}
      {label ?? cfg.label}
    </span>
  );
}
