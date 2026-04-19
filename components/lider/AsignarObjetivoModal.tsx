"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { asignarObjetivo } from "@/app/dashboard/lider/objetivos/actions";
import { Modal } from "@/components/ui";

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
  const [busqueda, setBusqueda] = useState("");

  const empleadosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [empleados, busqueda]);

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
    <Modal open onClose={onClose} titulo="Asignar objetivo" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empleados — selección múltiple */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">
              Empleados <span className="text-red-400">*</span>
              <span className="text-secondary/50 ml-1">({seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""})</span>
            </label>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary/50 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar empleado..."
                className="w-full bg-base border border-border rounded-lg pl-7 pr-3 py-2 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div className="bg-base border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
              {empleados.length === 0 ? (
                <p className="px-3 py-3 text-xs text-secondary/60">Sin empleados en el área.</p>
              ) : empleadosFiltrados.length === 0 ? (
                <p className="px-3 py-3 text-xs text-secondary/60">Sin resultados para &quot;{busqueda}&quot;.</p>
              ) : (
                empleadosFiltrados.map((emp) => (
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
              className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              placeholder="Detalles opcionales del objetivo..."
              className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary block mb-1.5">Categoría</label>
              <input
                name="categoria"
                type="text"
                placeholder="Ej: Desempeño"
                className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1.5">Vencimiento</label>
              <input
                name="vencimiento"
                type="date"
                className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
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
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-secondary hover:text-white hover:border-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || status === "ok"}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Guardando..." : "Asignar"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
