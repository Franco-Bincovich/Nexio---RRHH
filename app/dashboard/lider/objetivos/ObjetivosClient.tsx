"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, Circle, Loader, CheckCircle2, Calendar, Pencil, Trash2, History, XCircle, AlertCircle, Loader2, ArrowRight, Clock, Download } from "lucide-react";
import { exportarExcel, makeFilename } from "@/lib/export-xlsx";
import type { ObjetivoEstado } from "@/types/database";
import AsignarObjetivoModal from "@/components/lider/AsignarObjetivoModal";
import EditarObjetivoModal from "@/components/lider/EditarObjetivoModal";
import HistorialObjetivoModal from "@/components/lider/HistorialObjetivoModal";
import { eliminarObjetivo } from "./actions";

interface Objetivo {
  id: string;
  titulo: string;
  descripcion: string | null;
  progreso: number;
  estado: ObjetivoEstado;
  vencimiento: string | null;
  categoria: string | null;
  empleado_nombre: string;
}

interface Empleado {
  id: string;
  nombre: string;
}

interface HistorialEntry {
  id: string;
  objetivo_id: string;
  lider_nombre: string;
  campo_modificado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  fecha: string;
}

interface Props {
  objetivos: Objetivo[];
  empleados: Empleado[];
  empresaId: string;
  liderEmpleadoId: string;
  historialArea: HistorialEntry[];
  objetivoTituloMap: Record<string, string>;
}

const ESTADO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pendiente:   { label: "Pendiente",   icon: Circle,       color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  en_progreso: { label: "En progreso", icon: Loader,       color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20" },
  completado:  { label: "Completado",  icon: CheckCircle2, color: "text-accent",     bg: "bg-accent/10 border-accent/20" },
  cancelado:   { label: "Cancelado",   icon: XCircle,      color: "text-secondary",  bg: "bg-white/5 border-white/10" },
};

export default function ObjetivosClient({ objetivos, empleados, empresaId, liderEmpleadoId, historialArea, objetivoTituloMap }: Props) {
  const router = useRouter();
  const [isPendingDel, startDel] = useTransition();

  const [modalAsignar, setModalAsignar] = useState(false);
  const [editingObj, setEditingObj]     = useState<Objetivo | null>(null);
  const [historialObj, setHistorialObj] = useState<{ id: string; titulo: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; titulo: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");

  function handleDelete() {
    if (!confirmDelete) return;
    setDeleteError("");
    startDel(async () => {
      const res = await eliminarObjetivo(confirmDelete.id, confirmDelete.titulo);
      if (res.error) {
        setDeleteError(res.error);
      } else {
        setConfirmDelete(null);
        router.refresh();
      }
    });
  }

  function handleExport() {
    const completados = objetivos.filter((o) => o.estado === "completado").length;
    const progresoProm =
      objetivos.length > 0
        ? (objetivos.reduce((a, o) => a + (o.progreso ?? 0), 0) / objetivos.length).toFixed(1)
        : "—";
    type Row = { empleado: string; titulo: string; progreso: number; estado: string; vencimiento: string; categoria: string };
    const rows: Row[] = objetivos.map((o) => ({
      empleado:    o.empleado_nombre,
      titulo:      o.titulo,
      progreso:    o.progreso ?? 0,
      estado:      ESTADO_CONFIG[o.estado]?.label ?? o.estado,
      vencimiento: o.vencimiento ? (() => { const [y, m, d] = o.vencimiento!.split("-"); return `${d}/${m}/${y}`; })() : "",
      categoria:   o.categoria ?? "",
    }));
    exportarExcel<Row>({
      filename: makeFilename("objetivos", "equipo"),
      sheetName: "Objetivos",
      columns: [
        { header: "Empleado",    accessor: (r) => r.empleado,    width: 28 },
        { header: "Título",      accessor: (r) => r.titulo,      width: 32 },
        { header: "Progreso (%)",accessor: (r) => r.progreso,    width: 12 },
        { header: "Estado",      accessor: (r) => r.estado,      width: 14 },
        { header: "Vencimiento", accessor: (r) => r.vencimiento, width: 12 },
        { header: "Categoría",   accessor: (r) => r.categoria,   width: 16 },
      ],
      rows,
      footerRows: [
        ["", "", "", "Completados:", completados, ""],
        ["", "", "", "Progreso promedio (%):", progresoProm, ""],
      ],
    });
  }

  return (
    <>
      <div className="p-4 md:p-8 max-w-4xl">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Objetivos del área</h1>
            <p className="text-secondary text-sm">{objetivos.length} objetivo{objetivos.length !== 1 ? "s" : ""} asignado{objetivos.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={objetivos.length === 0}
              className="flex items-center gap-1.5 text-xs py-2 px-3 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              <Download size={13} />
              Exportar Excel
            </button>
            <button
              onClick={() => setModalAsignar(true)}
              className="flex items-center gap-2 bg-accent text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} />
              Asignar objetivo
            </button>
          </div>
        </div>

        {objetivos.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm py-16 text-center">
            <Target size={32} className="text-secondary mx-auto mb-3" />
            <p className="text-secondary text-sm">No hay objetivos asignados todavía.</p>
            <p className="text-secondary/60 text-xs mt-1">Usá el botón "Asignar objetivo" para crear el primero.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {objetivos.map((obj) => {
              const estado = ESTADO_CONFIG[obj.estado] ?? ESTADO_CONFIG.pendiente;
              const EstadoIcon = estado.icon;
              return (
                <div
                  key={obj.id}
                  className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold">{obj.titulo}</h3>
                        {obj.categoria && (
                          <span className="text-[10px] bg-white/5 text-secondary px-2 py-0.5 rounded-full">
                            {obj.categoria}
                          </span>
                        )}
                      </div>
                      {obj.descripcion && (
                        <p className="text-xs text-secondary leading-relaxed">{obj.descripcion}</p>
                      )}
                      <p className="text-xs text-secondary/70 mt-1">
                        Para: <span className="text-secondary">{obj.empleado_nombre}</span>
                        {obj.vencimiento && (
                          <>
                            {" · "}
                            <Calendar size={10} className="inline mb-0.5" />
                            {" "}
                            {formatFecha(obj.vencimiento)}
                          </>
                        )}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${estado.bg} ${estado.color}`}>
                      <EstadoIcon size={11} />
                      {estado.label}
                    </span>
                  </div>

                  {/* Progreso */}
                  <div>
                    <div className="flex justify-between text-xs text-secondary mb-1.5">
                      <span>Progreso</span>
                      <span>{obj.progreso}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${obj.progreso}%`,
                          backgroundColor: "#3ECFB2",
                          opacity: obj.progreso === 100 ? 1 : 0.6,
                        }}
                      />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <button
                      onClick={() => setEditingObj(obj)}
                      className="flex items-center gap-1.5 text-xs text-secondary hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      onClick={() => setHistorialObj({ id: obj.id, titulo: obj.titulo })}
                      className="flex items-center gap-1.5 text-xs text-secondary hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                      <History size={12} />
                      Ver historial
                    </button>
                    <button
                      onClick={() => { setDeleteError(""); setConfirmDelete({ id: obj.id, titulo: obj.titulo }); }}
                      className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-400/[0.05] transition-colors ml-auto"
                    >
                      <Trash2 size={12} />
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Historial global del área */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <History size={15} className="text-accent" />
          <h2 className="text-base font-semibold">Historial de cambios del área</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{historialArea.length} registro{historialArea.length !== 1 ? "s" : ""}</span>
        </div>

        {historialArea.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm py-12 text-center">
            <p className="text-sm text-secondary/60">Sin cambios registrados todavía.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
            <ul className="divide-y divide-border">
              {historialArea.map((entry) => (
                <HistorialRow
                  key={entry.id}
                  entry={entry}
                  objetivoTitulo={objetivoTituloMap[entry.objetivo_id] ?? "Objetivo eliminado"}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>

      {/* Modal asignar */}
      {modalAsignar && (
        <AsignarObjetivoModal
          empleados={empleados}
          empresaId={empresaId}
          liderEmpleadoId={liderEmpleadoId}
          onClose={() => setModalAsignar(false)}
        />
      )}

      {/* Modal editar */}
      {editingObj && (
        <EditarObjetivoModal
          objetivo={editingObj}
          onClose={() => setEditingObj(null)}
        />
      )}

      {/* Modal historial */}
      {historialObj && (
        <HistorialObjetivoModal
          objetivoId={historialObj.id}
          objetivoTitulo={historialObj.titulo}
          onClose={() => setHistorialObj(null)}
        />
      )}

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-400/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Eliminar objetivo</h2>
                <p className="text-xs text-secondary mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-sm text-secondary mb-4">
              ¿Eliminar <span className="text-white font-medium">"{confirmDelete.titulo}"</span>?
            </p>

            {deleteError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-secondary hover:text-white hover:border-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPendingDel}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPendingDel && <Loader2 size={14} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
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

function HistorialRow({ entry, objetivoTitulo }: { entry: { id: string; lider_nombre: string; campo_modificado: string; valor_anterior: string | null; valor_nuevo: string | null; fecha: string }; objetivoTitulo: string }) {
  const iso = new Date(entry.fecha).toISOString();
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-");
  const fecha = `${d}/${m}/${y} ${time.slice(0, 5)}`;

  const esEliminado = entry.campo_modificado === "eliminado";
  const esProgreso  = entry.campo_modificado === "progreso";
  const esEstado    = entry.campo_modificado === "estado";

  return (
    <li className="px-5 py-3.5 flex items-start gap-4 hover:bg-border/20 transition-colors">
      <div className="flex items-center gap-1 text-[10px] text-secondary/50 flex-shrink-0 w-32 pt-0.5">
        <Clock size={10} />
        {fecha}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-medium text-white">{entry.lider_nombre}</span>
          <span className="text-[10px] text-secondary/50">·</span>
          <span className="text-[11px] text-secondary/70 truncate max-w-[160px]">{objetivoTitulo}</span>
        </div>

        {esEliminado ? (
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
            Eliminado
          </span>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-secondary/60 font-medium">
              {CAMPO_LABEL[entry.campo_modificado] ?? entry.campo_modificado}:
            </span>
            {esEstado ? (
              <>
                <EstadoBadge valor={entry.valor_anterior ?? ""} />
                <ArrowRight size={10} className="text-secondary/40" />
                <EstadoBadge valor={entry.valor_nuevo ?? ""} />
              </>
            ) : (
              <>
                <span className="text-[11px] text-secondary/70 bg-white/[0.04] border border-border rounded px-1.5 py-0.5 max-w-[120px] truncate">
                  {entry.valor_anterior ?? "(vacío)"}
                </span>
                <ArrowRight size={10} className="text-secondary/40" />
                <span className={`text-[11px] rounded px-1.5 py-0.5 max-w-[120px] truncate ${esProgreso ? "text-accent bg-accent/10 border border-accent/20" : "text-white bg-accent/10 border border-accent/20"}`}>
                  {entry.valor_nuevo ?? "(vacío)"}
                  {esProgreso ? "%" : ""}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function EstadoBadge({ valor }: { valor: string }) {
  const cfg = ESTADO_CONFIG[valor];
  if (!cfg) return <span className="text-[11px] text-secondary">{valor}</span>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}
