"use client";

import { useState, useTransition } from "react";
import { setDemoRol } from "@/lib/demo-rol-actions";
import type { DemoRol } from "@/lib/demo-rol";

type Props = {
  esDemo: boolean;
  rolActivo: DemoRol | null;
};

const OPCIONES: { rol: DemoRol; label: string }[] = [
  { rol: "gerente", label: "Gerente" },
  { rol: "lider", label: "Líder" },
  { rol: "rrhh", label: "RRHH" },
  { rol: "empleado", label: "Empleado" },
  { rol: "owner", label: "Owner" },
];

export default function DemoRolSelector({ esDemo, rolActivo }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!esDemo) return null;

  function seleccionar(rol: DemoRol) {
    if (rol === rolActivo) {
      setOpen(false);
      return;
    }
    startTransition(() => {
      setDemoRol(rol);
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {open && (
        <div className="mb-2 bg-surface border border-border rounded-xl shadow-2xl w-56 overflow-hidden">
          <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wide text-secondary">
            Demo — ver como
          </div>
          <ul>
            {OPCIONES.map((op) => {
              const activo = op.rol === rolActivo;
              return (
                <li key={op.rol}>
                  <button
                    type="button"
                    onClick={() => seleccionar(op.rol)}
                    disabled={pending}
                    className={`w-full text-left px-3 py-2 text-sm transition flex items-center justify-between disabled:opacity-50 ${
                      activo
                        ? "bg-accent/10 text-accent"
                        : "hover:bg-white/5 text-foreground"
                    }`}
                  >
                    <span>{op.label}</span>
                    {activo && <span className="text-[10px]">● activo</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-accent text-base font-semibold text-sm rounded-full shadow-lg px-4 py-2.5 hover:opacity-90 transition flex items-center gap-2"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-base" />
        Demo: {rolActivo ?? "—"}
      </button>
    </div>
  );
}
