import type { ElementType, ReactNode } from "react";

type Props = {
  icon: ElementType;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon: Icon,
  titulo,
  descripcion,
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`bg-surface rounded-xl border border-border shadow-sm py-16 px-6 text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
        <Icon size={22} className="text-accent" />
      </div>
      <p className="text-sm font-medium mb-1">{titulo}</p>
      {descripcion && (
        <p className="text-xs text-secondary/70 max-w-md mx-auto">{descripcion}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
