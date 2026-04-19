import type { ReactNode } from "react";

type Props = {
  titulo: string;
  descripcion?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({
  titulo,
  descripcion,
  actions,
  className = "mb-8",
}: Props) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold mb-1">{titulo}</h1>
        {descripcion && (
          <p className="text-secondary text-sm">{descripcion}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
