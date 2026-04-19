"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, UserX, UserCheck, X, Loader2, Eye, EyeOff, Download } from "lucide-react";
import { crearEmpleado, editarEmpleado, toggleActivo } from "./actions";

type AreaBasica = { id: string; nombre: string };

type EmpleadoRow = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  modalidad: string;
  horas_laborables: number;
  activo: boolean;
  area_id: string | null;
  areas: { nombre: string } | null;
};

interface Props {
  empleados: EmpleadoRow[];
  areas: AreaBasica[];
}

const ROL_COLOR: Record<string, string> = {
  empleado: "text-secondary",
  lider:    "text-blue-400",
  gerente:  "text-accent",
  rrhh:     "text-purple-400",
};

const ROL_LABEL: Record<string, string> = {
  empleado: "Empleado",
  lider:    "Líder",
  gerente:  "Gerente",
  rrhh:     "RRHH",
};

export default function EmpleadosClient({ empleados, areas }: Props) {
  const router = useRouter();
  const [nuevoOpen, setNuevoOpen]   = useState(false);
  const [editando, setEditando]     = useState<EmpleadoRow | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [rowError, setRowError]     = useState<string | null>(null);
  const [exporting, setExporting]   = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const areaMap: Record<string, string> = {};
      areas.forEach((a) => { areaMap[a.id] = a.nombre; });

      const activos   = empleados.filter((e) => e.activo);
      const inactivos = empleados.filter((e) => !e.activo);

      const toRow = (e: EmpleadoRow) => ({
        Nombre:     e.nombre,
        Email:      e.email,
        Área:       e.areas?.nombre ?? areaMap[e.area_id ?? ""] ?? "",
        Rol:        e.rol,
        Modalidad:  e.modalidad,
        "Hs/día":   e.horas_laborables,
        Estado:     e.activo ? "Activo" : "Inactivo",
      });

      const wb = utils.book_new();
      utils.book_append_sheet(wb, utils.json_to_sheet(activos.map(toRow)),   "Activos");
      utils.book_append_sheet(wb, utils.json_to_sheet(inactivos.map(toRow)), "Inactivos");
      utils.book_append_sheet(wb, utils.json_to_sheet(empleados.map(toRow)), "Todos");

      writeFile(wb, `nomina_${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  async function handleToggle(emp: EmpleadoRow) {
    if (!emp.activo) {
      // Activar directamente
      setLoadingId(emp.id);
      const result = await toggleActivo(emp.id, true);
      setLoadingId(null);
      if (result.error) setRowError(result.error);
      else router.refresh();
      return;
    }
    // Desactivar: requiere confirmación
    setConfirmandoId(emp.id);
  }

  async function handleDesactivarConfirm(id: string) {
    setLoadingId(id);
    const result = await toggleActivo(id, false);
    setLoadingId(null);
    setConfirmandoId(null);
    if (result.error) setRowError(result.error);
    else router.refresh();
  }

  const activos   = empleados.filter((e) => e.activo).length;
  const inactivos = empleados.filter((e) => !e.activo).length;

  return (
    <>
      <div className="p-4 md:p-8 max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Empleados</h1>
            <p className="text-secondary text-sm">
              {activos} activo{activos !== 1 ? "s" : ""}
              {inactivos > 0 ? ` · ${inactivos} inactivo${inactivos !== 1 ? "s" : ""}` : ""}
              {" · "}{empleados.length} en total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || empleados.length === 0}
              className="flex items-center gap-2 border border-border text-secondary hover:text-foreground hover:border-accent text-sm px-3 py-2.5 rounded-xl transition-colors disabled:opacity-40"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exportar
            </button>
            <button
              onClick={() => setNuevoOpen(true)}
              className="flex items-center gap-2 bg-accent text-sidebar text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} />
              Nuevo empleado
            </button>
          </div>
        </div>

        {rowError && (
          <div className="mb-4 flex items-center justify-between gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm">
            <span>{rowError}</span>
            <button onClick={() => setRowError(null)}><X size={14} /></button>
          </div>
        )}

        {empleados.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm py-16 text-center">
            <p className="text-secondary text-sm">No hay empleados registrados todavía.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                  <th className="text-left px-5 py-3 font-medium">Empleado</th>
                  <th className="text-left px-5 py-3 font-medium">Área</th>
                  <th className="text-left px-5 py-3 font-medium">Rol</th>
                  <th className="text-left px-5 py-3 font-medium">Modalidad</th>
                  <th className="text-left px-5 py-3 font-medium">Hs/día</th>
                  <th className="text-left px-5 py-3 font-medium">Estado</th>
                  <th className="text-right px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((emp) => {
                  const initials = emp.nombre.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                  const isConfirming = confirmandoId === emp.id;
                  const isLoading    = loadingId === emp.id;

                  return (
                    <tr key={emp.id} className={`border-b border-border last:border-0 hover:bg-border/10 transition-colors ${!emp.activo ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-xs">{emp.nombre}</p>
                            <p className="text-[10px] text-secondary">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-secondary">{emp.areas?.nombre ?? <span className="italic opacity-50">Sin área</span>}</td>
                      <td className={`px-5 py-3.5 text-xs ${ROL_COLOR[emp.rol] ?? "text-secondary"}`}>{ROL_LABEL[emp.rol] ?? emp.rol}</td>
                      <td className="px-5 py-3.5 text-xs text-secondary capitalize">{emp.modalidad}</td>
                      <td className="px-5 py-3.5 text-xs text-secondary">{emp.horas_laborables}h</td>
                      <td className="px-5 py-3.5">
                        {emp.activo ? (
                          <span className="flex items-center gap-1 text-xs text-accent"><UserCheck size={12} />Activo</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-secondary/50"><UserX size={12} />Inactivo</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isConfirming ? (
                            <>
                              <button
                                onClick={() => setEditando(emp)}
                                className="flex items-center gap-1 text-xs text-secondary hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                              >
                                <Pencil size={12} />
                                Editar
                              </button>
                              <button
                                onClick={() => handleToggle(emp)}
                                disabled={isLoading}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                                  emp.activo
                                    ? "text-red-400 hover:bg-red-400/10"
                                    : "text-accent hover:bg-accent/10"
                                }`}
                              >
                                {isLoading ? <Loader2 size={12} className="animate-spin" /> : emp.activo ? <UserX size={12} /> : <UserCheck size={12} />}
                                {emp.activo ? "Desactivar" : "Activar"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDesactivarConfirm(emp.id)}
                                disabled={isLoading}
                                className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded-lg transition-colors"
                              >
                                {isLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                                Confirmar
                              </button>
                              <button
                                onClick={() => setConfirmandoId(null)}
                                className="text-xs text-secondary hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nuevoOpen && (
        <NuevoModal areas={areas} onClose={() => setNuevoOpen(false)} onSuccess={() => { setNuevoOpen(false); router.refresh(); }} />
      )}
      {editando && (
        <EditarModal empleado={editando} areas={areas} onClose={() => setEditando(null)} onSuccess={() => { setEditando(null); router.refresh(); }} />
      )}
    </>
  );
}

/* ─── Modal Nuevo Empleado ─────────────────────────────────── */

const defaultForm = { nombre: "", email: "", password: "nexio1234", area_id: "", rol: "empleado", modalidad: "presencial", horas_laborables: 8 };

function NuevoModal({ areas, onClose, onSuccess }: { areas: AreaBasica[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState(defaultForm);
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) { setStatus("error"); setError("Nombre y email son obligatorios."); return; }
    if (!form.password.trim()) { setStatus("error"); setError("La contraseña no puede estar vacía."); return; }
    setStatus("loading");
    const result = await crearEmpleado({
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      area_id: form.area_id || null,
      rol: form.rol,
      modalidad: form.modalidad,
      horas_laborables: Number(form.horas_laborables),
      password: form.password.trim(),
    });
    if (result.error) { setStatus("error"); setError(result.error); }
    else onSuccess();
  }

  return (
    <ModalWrapper title="Nuevo empleado" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre completo *">
          <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required placeholder="Ej: Ana García" className={inputCls} />
        </FormField>
        <FormField label="Email *">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="ana@empresa.com" className={inputCls} />
        </FormField>
        <FormField label="Contraseña temporal *">
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              placeholder="Contraseña inicial del empleado"
              className={`${inputCls} pr-10 font-mono`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-secondary/50 mt-1">El empleado podrá cambiarla tras su primer inicio de sesión.</p>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Área">
            <select value={form.area_id} onChange={(e) => set("area_id", e.target.value)} className={selectCls}>
              <option value="">Sin área</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Rol">
            <select value={form.rol} onChange={(e) => set("rol", e.target.value)} className={selectCls}>
              <option value="empleado">Empleado</option>
              <option value="lider">Líder</option>
              <option value="gerente">Gerente</option>
              <option value="rrhh">RRHH</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Modalidad">
            <select value={form.modalidad} onChange={(e) => set("modalidad", e.target.value)} className={selectCls}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </FormField>
          <FormField label="Horas / día">
            <input type="number" min={1} max={24} value={form.horas_laborables} onChange={(e) => set("horas_laborables", e.target.value)} className={inputCls} />
          </FormField>
        </div>
        <ModalFooter onClose={onClose} status={status} error={error} submitLabel="Crear empleado" />
      </form>
    </ModalWrapper>
  );
}

/* ─── Modal Editar Empleado ────────────────────────────────── */

function EditarModal({ empleado, areas, onClose, onSuccess }: { empleado: EmpleadoRow; areas: AreaBasica[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    area_id: empleado.area_id ?? "",
    rol: empleado.rol,
    modalidad: empleado.modalidad,
    horas_laborables: empleado.horas_laborables ?? 8,
    activo: empleado.activo,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  function set(field: string, value: string | number | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const result = await editarEmpleado(empleado.id, {
      area_id: form.area_id || null,
      rol: form.rol,
      modalidad: form.modalidad,
      horas_laborables: Number(form.horas_laborables),
      activo: form.activo,
    });
    if (result.error) { setStatus("error"); setError(result.error); }
    else onSuccess();
  }

  return (
    <ModalWrapper title={`Editar · ${empleado.nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Área">
            <select value={form.area_id} onChange={(e) => set("area_id", e.target.value)} className={selectCls}>
              <option value="">Sin área</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Rol">
            <select value={form.rol} onChange={(e) => set("rol", e.target.value)} className={selectCls}>
              <option value="empleado">Empleado</option>
              <option value="lider">Líder</option>
              <option value="gerente">Gerente</option>
              <option value="rrhh">RRHH</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Modalidad">
            <select value={form.modalidad} onChange={(e) => set("modalidad", e.target.value)} className={selectCls}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </FormField>
          <FormField label="Horas / día">
            <input type="number" min={1} max={24} value={form.horas_laborables} onChange={(e) => set("horas_laborables", e.target.value)} className={inputCls} />
          </FormField>
        </div>
        <FormField label="Estado">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => set("activo", !form.activo)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.activo ? "bg-accent" : "bg-white/15"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.activo ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className={`text-sm ${form.activo ? "text-accent" : "text-secondary"}`}>{form.activo ? "Activo" : "Inactivo"}</span>
          </label>
        </FormField>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-secondary block mb-1.5">{label}</label>
      {children}
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
