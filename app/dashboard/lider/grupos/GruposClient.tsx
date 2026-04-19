"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, UsersRound, Trash2, ChevronLeft, X, Loader2,
  UserPlus, UserMinus, AlertCircle,
} from "lucide-react";
import { crearGrupo, eliminarGrupo, agregarMiembro, eliminarMiembro } from "./actions";

interface Empleado {
  id: string;
  nombre: string;
}

interface Miembro {
  id: string; // grupos_miembros.id
  empleado_id: string;
  nombre: string;
}

interface Grupo {
  id: string;
  nombre: string;
  descripcion: string | null;
  miembros: Miembro[];
}

interface Props {
  grupos: Grupo[];
  empleados: Empleado[];
}

export default function GruposClient({ grupos, empleados }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vistaGrupo, setVistaGrupo] = useState<Grupo | null>(null);
  const [showNuevo, setShowNuevo]   = useState(false);
  const [confirmDelGrupo, setConfirmDelGrupo] = useState<{ id: string; nombre: string } | null>(null);
  const [addEmpleadoId, setAddEmpleadoId] = useState("");
  const [actionError, setActionError] = useState("");

  // Sincroniza vistaGrupo con datos actualizados tras refresh
  const grupoActual = vistaGrupo ? (grupos.find((g) => g.id === vistaGrupo.id) ?? null) : null;

  function handleVerGrupo(g: Grupo) {
    setVistaGrupo(g);
    setAddEmpleadoId("");
    setActionError("");
  }

  function handleAgregarMiembro() {
    if (!grupoActual || !addEmpleadoId) return;
    setActionError("");
    startTransition(async () => {
      const res = await agregarMiembro(grupoActual.id, addEmpleadoId);
      if (res.error) { setActionError(res.error); }
      else { setAddEmpleadoId(""); router.refresh(); }
    });
  }

  function handleEliminarMiembro(miembroId: string) {
    setActionError("");
    startTransition(async () => {
      const res = await eliminarMiembro(miembroId);
      if (res.error) setActionError(res.error);
      else router.refresh();
    });
  }

  function handleEliminarGrupo() {
    if (!confirmDelGrupo) return;
    startTransition(async () => {
      const res = await eliminarGrupo(confirmDelGrupo.id);
      if (res.error) setActionError(res.error);
      else {
        setConfirmDelGrupo(null);
        if (grupoActual?.id === confirmDelGrupo.id) setVistaGrupo(null);
        router.refresh();
      }
    });
  }

  const miembroIds = new Set(grupoActual?.miembros.map((m) => m.empleado_id) ?? []);
  const empleadosDisponibles = empleados.filter((e) => !miembroIds.has(e.id));

  return (
    <>
      <div className="p-4 md:p-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
          <div>
            {grupoActual ? (
              <>
                <button
                  onClick={() => { setVistaGrupo(null); setActionError(""); }}
                  className="flex items-center gap-1.5 text-xs text-secondary hover:text-white mb-2 transition-colors"
                >
                  <ChevronLeft size={14} /> Volver a grupos
                </button>
                <h1 className="text-2xl font-bold">{grupoActual.nombre}</h1>
                {grupoActual.descripcion && (
                  <p className="text-secondary text-sm mt-0.5">{grupoActual.descripcion}</p>
                )}
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-1">Grupos de trabajo</h1>
                <p className="text-secondary text-sm">{grupos.length} grupo{grupos.length !== 1 ? "s" : ""} en tu área</p>
              </>
            )}
          </div>
          {!grupoActual && (
            <button
              onClick={() => setShowNuevo(true)}
              className="flex items-center gap-2 bg-accent text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} />
              Nuevo grupo
            </button>
          )}
        </div>

        {/* Vista detalle de un grupo */}
        {grupoActual ? (
          <div className="space-y-5">
            {/* Miembros actuales */}
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <UsersRound size={14} className="text-accent" />
                <h2 className="text-sm font-semibold">Miembros</h2>
                <span className="ml-auto text-[10px] text-secondary/50">{grupoActual.miembros.length} miembro{grupoActual.miembros.length !== 1 ? "s" : ""}</span>
              </div>

              {grupoActual.miembros.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-secondary/60">Sin miembros todavía. Agregá empleados del área.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {grupoActual.miembros.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                        {m.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                      </div>
                      <span className="text-sm flex-1">{m.nombre}</span>
                      <button
                        onClick={() => handleEliminarMiembro(m.id)}
                        disabled={isPending}
                        className="text-secondary/50 hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Quitar del grupo"
                      >
                        <UserMinus size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Agregar miembro */}
            {empleadosDisponibles.length > 0 && (
              <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
                <h2 className="text-sm font-semibold mb-3">Agregar empleado</h2>
                <div className="flex gap-2">
                  <select
                    value={addEmpleadoId}
                    onChange={(e) => setAddEmpleadoId(e.target.value)}
                    className="flex-1 bg-base border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  >
                    <option value="">Seleccioná un empleado</option>
                    {empleadosDisponibles.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAgregarMiembro}
                    disabled={!addEmpleadoId || isPending}
                    className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Agregar
                  </button>
                </div>
              </div>
            )}

            {actionError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} />{actionError}
              </div>
            )}

            {/* Eliminar grupo */}
            <div className="pt-2">
              <button
                onClick={() => setConfirmDelGrupo({ id: grupoActual.id, nombre: grupoActual.nombre })}
                className="flex items-center gap-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
                Eliminar grupo
              </button>
            </div>
          </div>
        ) : (
          /* Lista de grupos */
          grupos.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border shadow-sm py-16 text-center">
              <UsersRound size={32} className="text-secondary/30 mx-auto mb-3" />
              <p className="text-secondary text-sm">No hay grupos creados todavía.</p>
              <p className="text-secondary/60 text-xs mt-1">Usá "Nuevo grupo" para crear el primero.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {grupos.map((g) => (
                <div key={g.id} className="bg-surface rounded-xl border border-border shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{g.nombre}</h3>
                      {g.descripcion && (
                        <p className="text-xs text-secondary mt-0.5 line-clamp-2">{g.descripcion}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmDelGrupo({ id: g.id, nombre: g.nombre })}
                      className="text-secondary/40 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-secondary/60 flex items-center gap-1.5">
                      <UsersRound size={12} />
                      {g.miembros.length} miembro{g.miembros.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => handleVerGrupo(g)}
                      className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      Ver / Editar →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal nuevo grupo */}
      {showNuevo && (
        <NuevoGrupoModal
          empleados={empleados}
          onClose={() => setShowNuevo(false)}
          onCreated={() => { setShowNuevo(false); router.refresh(); }}
        />
      )}

      {/* Modal confirmar eliminar grupo */}
      {confirmDelGrupo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelGrupo(null)} />
          <div className="relative bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-400/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Eliminar grupo</h2>
                <p className="text-xs text-secondary mt-0.5">Se eliminarán también sus miembros.</p>
              </div>
            </div>
            <p className="text-sm text-secondary mb-5">
              ¿Eliminar <span className="text-white font-medium">"{confirmDelGrupo.nombre}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelGrupo(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-secondary hover:text-white hover:border-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarGrupo}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NuevoGrupoModal({
  empleados,
  onClose,
  onCreated,
}: {
  empleados: Empleado[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  function toggleEmpleado(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const nombre      = (new FormData(form).get("nombre") as string).trim();
    const descripcion = (new FormData(form).get("descripcion") as string).trim() || null;
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    startTransition(async () => {
      const res = await crearGrupo({
        nombre,
        descripcion,
        miembrosIds: Array.from(seleccionados),
      });
      if (res.error) setError(res.error);
      else onCreated();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Nuevo grupo</h2>
          <button onClick={onClose} className="text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-secondary block mb-1.5">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              required
              placeholder="Ej: Proyecto Alpha"
              className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-secondary block mb-1.5">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              placeholder="Descripción opcional del grupo..."
              className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </div>

          {/* Miembros */}
          {empleados.length > 0 && (
            <div>
              <label className="text-xs text-secondary block mb-1.5">
                Miembros
                <span className="text-secondary/50 ml-1 normal-case tracking-normal">
                  (opcional · {seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""})
                </span>
              </label>
              <div className="bg-base border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {empleados.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.has(emp.id)}
                      onChange={() => toggleEmpleado(emp.id)}
                      className="accent-[#3ECFB2] w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-sm">{emp.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
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
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Creando..." : "Crear grupo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
