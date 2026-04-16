"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { asignarObjetivo } from "@/app/dashboard/lider/objetivos/actions";

interface Empleado {
  id: string;
  nombre: string;
}

interface Props {
  empleados: Empleado[];
  empresaId: string;
  liderEmpleadoId: string;
  onClose: () => void;
}

export default function AsignarObjetivoModal({ empleados, empresaId, liderEmpleadoId, onClose }: Props) {
  void empresaId; void liderEmpleadoId;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  function toggleEmpleado(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const titulo      = (data.get("titulo") as string).trim();
    const descripcion = (data.get("descripcion") as string).trim() || null;
    const vencimiento = (data.get("vencimiento") as string) || null;
    const categoria   = (data.get("categoria") as string).trim() || null;

    if (seleccionados.size === 0) {
      setStatus("error");
      setErrorMsg("Seleccioná al menos un empleado.");
      return;
    }
    if (!titulo) {
      setStatus("error");
      setErrorMsg("El título es obligatorio.");
      return;
    }

    startTransition(async () => {
      const res = await asignarObjetivo({
        empleadoIds: Array.from(seleccionados),
        titulo,
        descripcion,
        vencimiento,
        categoria,
      });
      if (res.error) {
        setStatus("error");
        setErrorMsg(res.error);
      } else {
        setStatus("ok");
        router.refresh();
        setTimeout(onClose, 800);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-[#1A2235] rounded-xl w-full max-w-md p-6 shadow-[0_1px_4px_rgba(0,0,0,0.4)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Asignar objetivo</h2>
          <button onClick={onClose} className="text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empleados — selección múltiple */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">
              Empleados <span className="text-red-400">*</span>
              <span className="text-secondary/50 ml-1">({seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""})</span>
            </label>
            <div className="bg-base border border-[#1A2235] rounded-lg divide-y divide-[#1A2235] max-h-40 overflow-y-auto">
              {empleados.length === 0 ? (
                <p className="px-3 py-3 text-xs text-secondary/60">Sin empleados en el área.</p>
              ) : (
                empleados.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(emp.id)}
                      onChange={() => toggleEmpleado(emp.id)}
                      className="accent-[#3ECFB2] w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-sm">{emp.nombre}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              name="titulo"
              type="text"
              required
              placeholder="Ej: Mejorar tiempo de respuesta al cliente"
              className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              placeholder="Detalles opcionales del objetivo..."
              className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary block mb-1.5">Categoría</label>
              <input
                name="categoria"
                type="text"
                placeholder="Ej: Desempeño"
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1.5">Vencimiento</label>
              <input
                name="vencimiento"
                type="date"
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {status === "error" && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
          {status === "ok" && (
            <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              Objetivo{seleccionados.size > 1 ? "s asignados" : " asignado"} correctamente.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#1A2235] text-sm text-secondary hover:text-white hover:border-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || status === "ok"}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-base text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Guardando..." : "Asignar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
