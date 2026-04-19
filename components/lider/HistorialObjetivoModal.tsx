"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Loader2, History, ArrowRight, Clock } from "lucide-react";
import { getHistorialObjetivo } from "@/app/dashboard/lider/objetivos/actions";

type EntradaHistorial = {
  id: string;
  lider_nombre: string;
  campo_modificado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  fecha: string;
};

interface Props {
  objetivoId: string;
  objetivoTitulo: string;
  onClose: () => void;
}

const CAMPO_LABEL: Record<string, string> = {
  titulo:      "Título",
  descripcion: "Descripción",
  progreso:    "Progreso",
  estado:      "Estado",
  vencimiento: "Vencimiento",
  categoria:   "Categoría",
  eliminado:   "Eliminado",
};

export default function HistorialObjetivoModal({ objetivoId, objetivoTitulo, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [historial, setHistorial] = useState<EntradaHistorial[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    startTransition(async () => {
      const res = await getHistorialObjetivo(objetivoId);
      if (res.error) {
        setError(res.error);
      } else {
        setHistorial(res.data ?? []);
      }
    });
  }, [objetivoId]);

  function formatFecha(iso: string) {
    const utc = new Date(iso).toISOString();
    const [date, time] = utc.split("T");
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y} ${time.slice(0, 5)}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl w-full max-w-lg shadow-sm max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <History size={14} className="text-accent" />
              <h2 className="text-sm font-semibold">Historial de cambios</h2>
            </div>
            <p className="text-[11px] text-secondary/60 mt-0.5 line-clamp-1">{objetivoTitulo}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-foreground transition-colors mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isPending && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-accent" />
            </div>
          )}

          {error && !isPending && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!isPending && !error && historial !== null && historial.length === 0 && (
            <div className="px-5 py-16 text-center">
              <History size={28} className="text-secondary/25 mx-auto mb-3" />
              <p className="text-sm text-secondary/60">Sin cambios registrados.</p>
            </div>
          )}

          {!isPending && historial && historial.length > 0 && (
            <ul className="divide-y divide-border">
              {historial.map((entry) => (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <span className="text-xs font-semibold">
                      {CAMPO_LABEL[entry.campo_modificado] ?? entry.campo_modificado}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-secondary/50 flex-shrink-0">
                      <Clock size={10} />
                      {formatFecha(entry.fecha)}
                    </div>
                  </div>

                  {entry.campo_modificado === "eliminado" ? (
                    <p className="text-xs text-red-400">Objetivo eliminado por {entry.lider_nombre}</p>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-secondary/70 bg-white/[0.04] border border-border rounded px-2 py-0.5 line-clamp-1 max-w-[180px]">
                        {entry.valor_anterior ?? "(vacío)"}
                      </span>
                      <ArrowRight size={11} className="text-secondary/40 flex-shrink-0" />
                      <span className="text-xs text-foreground bg-accent/10 border border-accent/20 rounded px-2 py-0.5 line-clamp-1 max-w-[180px]">
                        {entry.valor_nuevo ?? "(vacío)"}
                      </span>
                    </div>
                  )}

                  <p className="text-[10px] text-secondary/40 mt-1.5">Por {entry.lider_nombre}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg border border-border text-sm text-secondary hover:text-foreground hover:border-white/20 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
