"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, Loader2, Star, X, AlertCircle, Users,
} from "lucide-react";
import {
  CRITERIOS,
  promedioCriterios,
  type CriterioKey,
  type CriterioScores,
} from "@/lib/evaluaciones";
import { crearEvaluacion } from "./actions";
import { Badge, PageHeader } from "@/components/ui";

export type EmpleadoEvalRow = {
  empleado_id: string;
  nombre: string;
  estado: "pendiente" | "completada";
  promedio: number | null; // 1..5
  fecha: string | null;
};

type Props = {
  empleados: EmpleadoEvalRow[];
  areaNombre: string | null;
  cicloDesde: string | null;
};

export default function EvaluacionesLiderClient({ empleados, areaNombre, cicloDesde }: Props) {
  const [activo, setActivo] = useState<EmpleadoEvalRow | null>(null);

  const completadas = empleados.filter((e) => e.estado === "completada").length;
  const pendientes = empleados.length - completadas;

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-6">
      <PageHeader
        titulo="Evaluaciones"
        descripcion={`${areaNombre ? `${areaNombre} · ` : ""}Ciclo abierto${cicloDesde ? ` desde ${new Date(cicloDesde).toLocaleDateString("es-AR")}` : ""}`}
        className="mb-0"
      />

      <div className="grid grid-cols-3 gap-4">
        <Kpi icon={<Users size={13} className="text-blue-400" />}       label="Equipo"       value={empleados.length}   color="text-blue-400" />
        <Kpi icon={<CheckCircle2 size={13} className="text-accent" />}  label="Completadas"  value={completadas}        color="text-accent" />
        <Kpi icon={<Clock size={13} className="text-yellow-400" />}     label="Pendientes"   value={pendientes}         color="text-yellow-400" />
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Integrantes</h2>
        </div>
        {empleados.length === 0 ? (
          <p className="px-5 py-10 text-sm text-secondary/60 text-center">
            No hay empleados para evaluar en tu ámbito.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {empleados.map((e) => (
              <li
                key={e.empleado_id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-border/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{e.nombre}</p>
                  {e.estado === "completada" && e.fecha && (
                    <p className="text-[10px] text-secondary/60 mt-0.5">
                      Completada el {new Date(e.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>

                {e.promedio !== null && (
                  <span className="flex items-center gap-1 text-xs text-accent">
                    <Star size={12} className="fill-accent" />
                    {e.promedio.toFixed(2)}
                  </span>
                )}

                {e.estado === "completada" ? (
                  <Badge estado="completada" showIcon={false} />
                ) : (
                  <button
                    onClick={() => setActivo(e)}
                    className="text-xs bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-lg px-3 py-1.5 font-medium transition-colors"
                  >
                    Evaluar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {activo && (
        <EvaluacionModal
          empleado={activo}
          onClose={() => setActivo(null)}
        />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">{label}</p>
      </div>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function EvaluacionModal({
  empleado, onClose,
}: {
  empleado: EmpleadoEvalRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scores, setScores] = useState<CriterioScores>(() => {
    const init = {} as CriterioScores;
    for (const c of CRITERIOS) init[c.key] = 3;
    return init;
  });
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);

  const promedio = promedioCriterios(scores);

  function setScore(k: CriterioKey, v: number) {
    setScores((prev) => ({ ...prev, [k]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await crearEvaluacion({
        empleadoId: empleado.empleado_id,
        scores,
        comentario,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Evaluar a {empleado.nombre}</h2>
            <p className="text-xs text-secondary/70">Calificá cada criterio del 1 al 5</p>
          </div>
          <button onClick={onClose} className="p-1 text-secondary hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {CRITERIOS.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm">{c.label}</p>
                <span className="text-xs font-semibold text-accent">{scores[c.key]}</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(c.key, n)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      scores[c.key] >= n
                        ? "bg-accent/20 border-accent/30 text-accent"
                        : "border-border text-secondary hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-accent/5 border border-accent/15 rounded-xl px-4 py-3 flex items-center gap-3">
            <Star size={14} className="text-accent fill-accent" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-secondary/70">Promedio</p>
              <p className="text-lg font-bold text-accent">{promedio.toFixed(2)} / 5</p>
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Comentario (opcional)</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50 placeholder:text-secondary/40"
              placeholder="Observaciones sobre el desempeño..."
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-3">
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-foreground transition-colors">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Guardar evaluación
          </button>
        </div>
      </div>
    </div>
  );
}
