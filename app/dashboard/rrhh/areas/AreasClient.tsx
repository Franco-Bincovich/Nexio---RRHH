"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Users, UserCheck, X, Loader2, Building2 } from "lucide-react";
import { crearArea, editarArea, eliminarArea } from "./actions";

type LiderBasico = { id: string; nombre: string };

type AreaConDatos = {
  id: string;
  nombre: string;
  lider_id: string | null;
  liderNombre: string | null;
  totalEmpleados: number;
};

interface Props {
  areas: AreaConDatos[];
  lideres: LiderBasico[];
}

export default function AreasClient({ areas, lideres }: Props) {
  const router = useRouter();
  const [nuevaOpen, setNuevaOpen]     = useState(false);
  const [editando, setEditando]       = useState<AreaConDatos | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [loadingId, setLoadingId]     = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function handleEliminar(id: string) {
    setLoadingId(id);
    const result = await eliminarArea(id);
    setLoadingId(null);
    setEliminandoId(null);
    if (result.error) setGlobalError(result.error);
    else router.refresh();
  }

  return (
    <>
      <div className="p-4 md:p-8 max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Áreas</h1>
            <p className="text-secondary text-sm">{areas.length} área{areas.length !== 1 ? "s" : ""} registrada{areas.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => setNuevaOpen(true)}
            className="flex items-center gap-2 bg-accent text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Nueva área
          </button>
        </div>

        {globalError && (
          <div className="mb-4 flex items-center justify-between gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
            <span>{globalError}</span>
            <button onClick={() => setGlobalError(null)}><X size={14} /></button>
          </div>
        )}

        {areas.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm py-16 text-center">
            <Building2 size={32} className="text-secondary mx-auto mb-3" />
            <p className="text-secondary text-sm">No hay áreas registradas todavía.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => {
              const isConfirming = eliminandoId === area.id;
              const isLoading    = loadingId === area.id;
              const initials = area.liderNombre
                ? area.liderNombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
                : null;

              return (
                <div key={area.id} className="bg-surface rounded-xl border border-border shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Building2 size={18} className="text-accent" />
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-secondary">
                      <Users size={12} />
                      {area.totalEmpleados} activo{area.totalEmpleados !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <h3 className="font-bold text-base mb-3">{area.nombre}</h3>

                  <div className="border-t border-border pt-3 mb-4">
                    {area.liderNombre ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-400/15 border border-blue-400/25 flex items-center justify-center text-[10px] font-bold text-blue-400">
                          {initials}
                        </div>
                        <p className="text-xs text-secondary truncate">{area.liderNombre}</p>
                        <UserCheck size={12} className="text-accent ml-auto flex-shrink-0" />
                      </div>
                    ) : (
                      <p className="text-xs text-secondary/50 italic">Sin líder asignado</p>
                    )}
                  </div>

                  {!isConfirming ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditando(area)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-secondary hover:text-white border border-border hover:border-white/20 rounded-lg py-1.5 transition-colors"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => { setEliminandoId(area.id); setGlobalError(null); }}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-red-400 hover:bg-red-400/10 border border-border hover:border-red-400/20 rounded-lg py-1.5 transition-colors"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-400 text-center">¿Eliminar esta área?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEliminar(area.id)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1 text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg py-1.5 transition-colors"
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                          Confirmar
                        </button>
                        <button
                          onClick={() => setEliminandoId(null)}
                          className="flex-1 text-xs text-secondary hover:text-white border border-border rounded-lg py-1.5 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {nuevaOpen && (
        <NuevaAreaModal lideres={lideres} onClose={() => setNuevaOpen(false)} onSuccess={() => { setNuevaOpen(false); router.refresh(); }} />
      )}
      {editando && (
        <EditarAreaModal area={editando} lideres={lideres} onClose={() => setEditando(null)} onSuccess={() => { setEditando(null); router.refresh(); }} />
      )}
    </>
  );
}

/* ─── Modal Nueva Área ─────────────────────────────────────── */

function NuevaAreaModal({ lideres, onClose, onSuccess }: { lideres: LiderBasico[]; onClose: () => void; onSuccess: () => void }) {
  const [nombre, setNombre]     = useState("");
  const [liderId, setLiderId]   = useState("");
  const [status, setStatus]     = useState<"idle" | "loading" | "error">("idle");
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setStatus("error"); setError("El nombre del área es obligatorio."); return; }
    setStatus("loading");
    const result = await crearArea({ nombre, lider_id: liderId || null });
    if (result.error) { setStatus("error"); setError(result.error); }
    else onSuccess();
  }

  return (
    <ModalWrapper title="Nueva área" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-secondary block mb-1.5">Nombre del área *</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Tecnología" className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-secondary block mb-1.5">Líder asignado</label>
          <select value={liderId} onChange={(e) => setLiderId(e.target.value)} className={selectCls}>
            <option value="">Sin líder</option>
            {lideres.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
          {lideres.length === 0 && <p className="text-[10px] text-secondary/60 mt-1">No hay empleados con rol Líder registrados.</p>}
        </div>
        <ModalFooter onClose={onClose} status={status} error={error} submitLabel="Crear área" />
      </form>
    </ModalWrapper>
  );
}

/* ─── Modal Editar Área ────────────────────────────────────── */

function EditarAreaModal({ area, lideres, onClose, onSuccess }: { area: AreaConDatos; lideres: LiderBasico[]; onClose: () => void; onSuccess: () => void }) {
  const [nombre, setNombre]   = useState(area.nombre);
  const [liderId, setLiderId] = useState(area.lider_id ?? "");
  const [status, setStatus]   = useState<"idle" | "loading" | "error">("idle");
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setStatus("error"); setError("El nombre no puede estar vacío."); return; }
    setStatus("loading");
    const result = await editarArea(area.id, { nombre, lider_id: liderId || null });
    if (result.error) { setStatus("error"); setError(result.error); }
    else onSuccess();
  }

  return (
    <ModalWrapper title={`Editar · ${area.nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-secondary block mb-1.5">Nombre del área *</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-secondary block mb-1.5">Líder asignado</label>
          <select value={liderId} onChange={(e) => setLiderId(e.target.value)} className={selectCls}>
            <option value="">Sin líder</option>
            {lideres.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </div>
        <ModalFooter onClose={onClose} status={status} error={error} submitLabel="Guardar cambios" />
      </form>
    </ModalWrapper>
  );
}

/* ─── Shared UI helpers ────────────────────────────────────── */

const inputCls  = "w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors";
const selectCls = "w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors";

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-secondary hover:text-white transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, status, error, submitLabel }: { onClose: () => void; status: string; error: string; submitLabel: string }) {
  return (
    <>
      {status === "error" && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-secondary hover:text-white hover:border-white/20 transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {status === "loading" && <Loader2 size={14} className="animate-spin" />}
          {status === "loading" ? "Guardando..." : submitLabel}
        </button>
      </div>
    </>
  );
}
