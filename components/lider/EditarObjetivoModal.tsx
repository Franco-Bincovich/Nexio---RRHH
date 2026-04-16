"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Save } from "lucide-react";
import { editarObjetivo } from "@/app/dashboard/lider/objetivos/actions";

type ObjetivoEstado = "pendiente" | "en_progreso" | "completado" | "cancelado";

interface Objetivo {
  id: string;
  titulo: string;
  descripcion: string | null;
  progreso: number;
  estado: ObjetivoEstado;
  vencimiento: string | null;
  categoria: string | null;
}

interface Props {
  objetivo: Objetivo;
  onClose: () => void;
}

const ESTADOS: { value: ObjetivoEstado; label: string }[] = [
  { value: "pendiente",   label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "completado",  label: "Completado" },
  { value: "cancelado",   label: "Cancelado" },
];

function estadoPorProgreso(p: number): ObjetivoEstado {
  if (p === 0) return "pendiente";
  if (p === 100) return "completado";
  return "en_progreso";
}

export default function EditarObjetivoModal({ objetivo, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const [titulo, setTitulo]           = useState(objetivo.titulo);
  const [descripcion, setDescripcion] = useState(objetivo.descripcion ?? "");
  const [progreso, setProgreso]       = useState(objetivo.progreso);
  const [estado, setEstado]           = useState<ObjetivoEstado>(objetivo.estado);
  const [vencimiento, setVencimiento] = useState(objetivo.vencimiento ?? "");
  const [categoria, setCategoria]     = useState(objetivo.categoria ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { setError("El título es obligatorio."); return; }
    setError("");
    startTransition(async () => {
      const res = await editarObjetivo({
        objetivoId: objetivo.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        progreso,
        estado,
        vencimiento: vencimiento || null,
        categoria: categoria.trim() || null,
        original: {
          titulo: objetivo.titulo,
          descripcion: objetivo.descripcion,
          progreso: objetivo.progreso,
          estado: objetivo.estado,
          vencimiento: objetivo.vencimiento,
          categoria: objetivo.categoria,
        },
      });
      if (res.error) {
        setError(res.error);
      } else {
        setOk(true);
        router.refresh();
        setTimeout(onClose, 700);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-[#1A2235] rounded-xl w-full max-w-md p-6 shadow-[0_1px_4px_rgba(0,0,0,0.4)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Editar objetivo</h2>
          <button onClick={onClose} className="text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              type="text"
              required
              className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          {/* Progreso */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">
              Progreso — <span className="text-white font-medium">{progreso}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={progreso}
              onChange={(e) => {
                const val = Number(e.target.value);
                setProgreso(val);
                if (estado !== "cancelado") setEstado(estadoPorProgreso(val));
              }}
              className="w-full accent-[#3ECFB2]"
            />
            <div className="flex justify-between text-[10px] text-secondary/40 mt-0.5">
              <span>0%</span><span>100%</span>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as ObjetivoEstado)}
              className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors"
            >
              {ESTADOS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Categoría */}
            <div>
              <label className="text-xs text-secondary block mb-1.5">Categoría</label>
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                type="text"
                placeholder="Ej: Desempeño"
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            {/* Vencimiento */}
            <div>
              <label className="text-xs text-secondary block mb-1.5">Vencimiento</label>
              <input
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value)}
                type="date"
                className="w-full bg-base border border-[#1A2235] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {ok && (
            <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              Objetivo actualizado correctamente.
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
              disabled={isPending || ok}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-base text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
