"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl";

const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  sm:  "max-w-sm",
  md:  "max-w-md",
  lg:  "max-w-lg",
  xl:  "max-w-xl",
  "2xl": "max-w-2xl",
};

type Props = {
  open: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: MaxWidth;
  /** Cerrar al hacer click en el backdrop. Default: true. */
  closeOnBackdrop?: boolean;
};

export default function Modal({
  open,
  onClose,
  titulo,
  subtitulo,
  children,
  footer,
  maxWidth = "md",
  closeOnBackdrop = true,
}: Props) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className={`relative bg-surface border border-border rounded-xl w-full ${MAX_WIDTH_CLASS[maxWidth]} shadow-sm max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
          <div>
            <h2 id="modal-titulo" className="text-base font-semibold">{titulo}</h2>
            {subtitulo && <p className="text-xs text-secondary/70 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6">{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-2 flex flex-wrap gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
