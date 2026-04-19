import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Si true, no aplica padding interno (útil para cards con header + body separados o tablas). */
  noPadding?: boolean;
  as?: "div" | "section" | "article";
};

/**
 * Card estándar del sistema Nexio.
 * Estilo base: bg-surface + border + shadow, respeta tema dark/light.
 * Pass-through de className para customización (ej. overflow-hidden, p-0, etc.).
 */
export default function Card({
  children,
  className = "",
  noPadding = false,
  as: Tag = "div",
}: Props) {
  const padding = noPadding ? "" : "p-5";
  return (
    <Tag className={`bg-surface rounded-xl border border-border shadow-sm ${padding} ${className}`}>
      {children}
    </Tag>
  );
}
