"use client";
import { useState, useMemo, useTransition, useRef, useEffect } from "react";
import {
  MessageSquare,
  Megaphone,
  Plus,
  Trash2,
  X,
  Loader2,
  Shield,
  Building2,
  Filter,
} from "lucide-react";
import { crearMensaje, eliminarMensaje } from "./actions";
import type { Mensaje, Area, Empleado } from "./page";

interface Props {
  empresaId: string;
  mensajes: Mensaje[];
  areas: Area[];
  empleados: Empleado[];
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD} día${diffD > 1 ? "s" : ""}`;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function initials(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const ROL_LABEL: Record<string, string> = {
  rrhh: "RRHH",
  lider: "Líder",
  gerente: "Gerente",
  empleado: "Empleado",
};

export default function ForosClient({
  empresaId,
  mensajes: initialMensajes,
  areas,
  empleados,
}: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(initialMensajes);
  const [filterArea, setFilterArea] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create modal state
  const [newArea, setNewArea] = useState<string>("null");
  const [newMensaje, setNewMensaje] = useState("");
  const [createError, setCreateError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [showModal]);

  const empMap = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, e])),
    [empleados]
  );
  const areaMap = useMemo(
    () => Object.fromEntries(areas.map((a) => [a.id, a.nombre])),
    [areas]
  );

  const filtered = useMemo(() => {
    if (filterArea === "all") return mensajes;
    if (filterArea === "null") return mensajes.filter((m) => m.area_id === null);
    return mensajes.filter((m) => m.area_id === filterArea);
  }, [mensajes, filterArea]);

  async function handleCreate() {
    if (!newMensaje.trim()) {
      setCreateError("El mensaje no puede estar vacío.");
      return;
    }
    setCreateError("");
    startTransition(async () => {
      const areaId = newArea === "null" ? null : newArea;
      const result = await crearMensaje(empresaId, areaId, newMensaje);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      // Optimistic: add to local state with a temp id
      const tempMensaje: Mensaje = {
        id: `tmp-${Date.now()}`,
        area_id: areaId,
        autor_id: "me",
        mensaje: newMensaje.trim(),
        created_at: new Date().toISOString(),
      };
      setMensajes((prev) => [tempMensaje, ...prev]);
      setNewMensaje("");
      setNewArea("null");
      setShowModal(false);
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await eliminarMensaje(id);
      if (!result.error) {
        setMensajes((prev) => prev.filter((m) => m.id !== id));
      }
      setDeletingId(null);
    });
  }

  const generalCount = mensajes.filter((m) => m.area_id === null).length;
  const totalCount = mensajes.length;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Foros</h1>
          <p className="text-secondary text-sm">
            {totalCount} publicación{totalCount !== 1 ? "es" : ""} · Gestión
            RRHH
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-sm bg-accent text-[#0A0F1C] font-semibold px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo mensaje
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter size={13} className="text-secondary flex-shrink-0" />
        {[
          { value: "all", label: `Todos (${totalCount})` },
          { value: "null", label: `RRHH General (${generalCount})` },
          ...areas.map((a) => ({
            value: a.id,
            label: `${a.nombre} (${mensajes.filter((m) => m.area_id === a.id).length})`,
          })),
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterArea(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterArea === opt.value
                ? "bg-accent/15 text-accent font-medium"
                : "text-secondary hover:text-white hover:bg-border/20"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-10 text-center">
          <MessageSquare size={32} className="text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-secondary">
            No hay mensajes en este foro aún.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => {
            const autor = empMap[msg.autor_id];
            const areaNombre = msg.area_id
              ? (areaMap[msg.area_id] ?? "Área desconocida")
              : "RRHH General";
            const isDeleting = deletingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`bg-surface rounded-xl border border-border shadow-sm p-5 hover:border-white/10 transition-colors ${
                  isDeleting ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0 mt-0.5">
                    {autor ? initials(autor.nombre) : "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium">
                        {autor?.nombre ?? "Usuario"}
                      </span>
                      {autor && (
                        <span className="flex items-center gap-1 text-xs text-purple-400">
                          <Shield size={10} />
                          {ROL_LABEL[autor.rol] ?? autor.rol}
                        </span>
                      )}
                      <span className="text-xs text-secondary">
                        · {fmtDate(msg.created_at)}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[10px] bg-border/10 text-secondary px-2 py-0.5 rounded-full">
                        <Building2 size={9} />
                        {areaNombre}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-secondary/90 leading-relaxed whitespace-pre-wrap break-words">
                      {msg.mensaje}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(msg.id)}
                    disabled={isDeleting || isPending}
                    title="Eliminar mensaje"
                    className="flex-shrink-0 p-1.5 rounded-lg text-secondary/40 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30"
                  >
                    {isDeleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Megaphone size={14} className="text-accent" />
                </div>
                <h2 className="text-base font-semibold">Nuevo mensaje</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-secondary hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Area selector */}
            <div className="mb-4">
              <label className="block text-xs text-secondary mb-1.5">
                Foro destino
              </label>
              <select
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
              >
                <option value="null">RRHH General (toda la empresa)</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    Área: {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Message textarea */}
            <div className="mb-4">
              <label className="block text-xs text-secondary mb-1.5">
                Mensaje
              </label>
              <textarea
                ref={textareaRef}
                value={newMensaje}
                onChange={(e) => setNewMensaje(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Escribí el mensaje para el foro…"
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50 placeholder:text-secondary/40"
              />
              <div className="text-right text-[10px] text-secondary/40 mt-1">
                {newMensaje.length}/2000
              </div>
            </div>

            {createError && (
              <p className="text-xs text-red-400 mb-3">{createError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !newMensaje.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-[#0A0F1C] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Megaphone size={14} />
                )}
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
