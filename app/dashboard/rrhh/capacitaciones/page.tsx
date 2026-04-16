"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import {
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Archive,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type CapEstado = "activa" | "archivada";
type AsigEstado = "pendiente" | "en_curso" | "completado";

type Capacitacion = {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  obligatoria: boolean;
  estado: CapEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
};

type Asignacion = {
  id: string;
  capacitacion_id: string;
  empleado_id: string;
  estado: AsigEstado;
};

type Empleado = { id: string; nombre: string; area_id: string | null };
type Area = { id: string; nombre: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIAS = ["General","Onboarding","Seguridad","Liderazgo","Soft Skills","Herramientas","Técnica","Cumplimiento"];

const CATEGORIA_COLOR: Record<string, string> = {
  "Onboarding":   "bg-blue-500/10 text-blue-400",
  "Seguridad":    "bg-red-500/10 text-red-400",
  "Liderazgo":    "bg-accent/10 text-accent",
  "Soft Skills":  "bg-purple-500/10 text-purple-400",
  "Herramientas": "bg-yellow-500/10 text-yellow-400",
  "Técnica":      "bg-orange-500/10 text-orange-400",
  "Cumplimiento": "bg-pink-500/10 text-pink-400",
  "General":      "bg-border/10 text-secondary",
};

const ASIG_CONFIG: Record<AsigEstado, { label: string; color: string; dot: string }> = {
  pendiente:   { label: "Pendiente",  color: "text-secondary",   dot: "bg-secondary/40" },
  en_curso:    { label: "En curso",   color: "text-yellow-400",  dot: "bg-yellow-400" },
  completado:  { label: "Completado", color: "text-accent",      dot: "bg-accent" },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ── Nueva capacitación modal ──────────────────────────────────────────────────

function NuevaCapacitacionModal({
  empresaId,
  onClose,
  onCreated,
}: {
  empresaId: string;
  onClose: () => void;
  onCreated: (c: Capacitacion) => void;
}) {
  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria]     = useState("General");
  const [obligatoria, setObligatoria] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  async function handleSave() {
    if (!titulo.trim()) { setError("El título es obligatorio."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error: err } = await db
      .from("capacitaciones")
      .insert({
        empresa_id:  empresaId,
        titulo:      titulo.trim(),
        descripcion: descripcion.trim() || null,
        categoria,
        obligatoria,
        estado:      "activa",
        fecha_inicio: fechaInicio || null,
        fecha_fin:    fechaFin || null,
      })
      .select()
      .single();
    if (err) { setError(err.message); setSaving(false); return; }
    onCreated(data as Capacitacion);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Nueva capacitación</h2>
          <button onClick={onClose} className="p-1 text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ej. Inducción corporativa"
              autoFocus
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-secondary/40"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1.5">Descripción <span className="text-secondary/40">(opcional)</span></label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
              >
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <div
                  onClick={() => setObligatoria((v) => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${obligatoria ? "bg-accent" : "bg-border/20"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${obligatoria ? "left-4" : "left-0.5"}`} />
                </div>
                <span className="text-xs text-secondary">Obligatoria</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Fecha inicio <span className="text-secondary/40">(opcional)</span></label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1.5">Fecha fin <span className="text-secondary/40">(opcional)</span></label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !titulo.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-[#0A0F1C] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Crear capacitación
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Asignar empleados modal ───────────────────────────────────────────────────

function AsignarModal({
  capacitacion,
  empleados,
  areas,
  asignados,
  onClose,
  onAsignado,
}: {
  capacitacion: Capacitacion;
  empleados: Empleado[];
  areas: Area[];
  asignados: Set<string>;
  onClose: () => void;
  onAsignado: (nuevas: Asignacion[]) => void;
}) {
  const [modo, setModo]             = useState<"individual" | "area">("individual");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const noAsignados = empleados.filter((e) => !asignados.has(e.id));
  const empsByArea  = selectedArea
    ? noAsignados.filter((e) => e.area_id === selectedArea)
    : [];

  function toggleEmp(id: string) {
    setSelectedEmps((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  async function handleSave() {
    const ids = modo === "individual"
      ? [...selectedEmps]
      : empsByArea.map((e) => e.id);
    if (ids.length === 0) { setError("Seleccioná al menos un empleado."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const rows = ids.map((eid) => ({
      capacitacion_id: capacitacion.id,
      empleado_id: eid,
      estado: "pendiente",
    }));
    const { data, error: err } = await db
      .from("empleado_capacitacion")
      .insert(rows)
      .select();
    if (err) { setError(err.message); setSaving(false); return; }
    onAsignado((data ?? []) as Asignacion[]);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Asignar empleados</h2>
            <p className="text-xs text-secondary mt-0.5 truncate max-w-[260px]">{capacitacion.titulo}</p>
          </div>
          <button onClick={onClose} className="p-1 text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Modo tabs */}
        <div className="flex gap-1 bg-base rounded-lg p-1 mb-4">
          {(["individual", "area"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                modo === m ? "bg-accent/15 text-accent font-medium" : "text-secondary hover:text-white"
              }`}
            >
              {m === "individual" ? "Empleados" : "Por área completa"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {modo === "individual" ? (
            <div className="space-y-1">
              {noAsignados.length === 0 ? (
                <p className="text-xs text-secondary/60 text-center py-6">Todos los empleados ya están asignados.</p>
              ) : noAsignados.map((e) => (
                <label key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmps.has(e.id)}
                    onChange={() => toggleEmp(e.id)}
                    className="accent-[#3ECFB2] w-3.5 h-3.5"
                  />
                  <span className="text-sm">{e.nombre}</span>
                </label>
              ))}
            </div>
          ) : (
            <div>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:border-accent/50"
              >
                <option value="">Seleccionar área…</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              {selectedArea && (
                <div className="bg-base border border-border rounded-lg p-3">
                  {empsByArea.length === 0 ? (
                    <p className="text-xs text-secondary/60 text-center py-2">Todos los empleados de esta área ya están asignados.</p>
                  ) : (
                    <>
                      <p className="text-xs text-secondary mb-2">Se asignarán {empsByArea.length} empleado{empsByArea.length !== 1 ? "s" : ""}:</p>
                      <div className="space-y-1">
                        {empsByArea.map((e) => (
                          <p key={e.id} className="text-xs text-secondary/80">{e.nombre}</p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (modo === "individual" && selectedEmps.size === 0) || (modo === "area" && (!selectedArea || empsByArea.length === 0))}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-[#0A0F1C] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Capacitacion card ─────────────────────────────────────────────────────────

function CapacitacionCard({
  cap,
  asignaciones,
  empleados,
  areas,
  onAsignar,
  onArchivar,
  onUpdateAsig,
}: {
  cap: Capacitacion;
  asignaciones: Asignacion[];
  empleados: Empleado[];
  areas: Area[];
  onAsignar: () => void;
  onArchivar: (id: string) => void;
  onUpdateAsig: (id: string, estado: AsigEstado) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const empMap = useMemo(() => Object.fromEntries(empleados.map((e) => [e.id, e])), [empleados]);

  const total      = asignaciones.length;
  const completados = asignaciones.filter((a) => a.estado === "completado").length;
  const enCurso    = asignaciones.filter((a) => a.estado === "en_curso").length;
  const pct        = total > 0 ? Math.round((completados / total) * 100) : 0;

  const catColor = CATEGORIA_COLOR[cap.categoria] ?? "bg-border/10 text-secondary";

  async function handleArchivar() {
    setArchiving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("capacitaciones")
      .update({ estado: "archivada" })
      .eq("id", cap.id);
    onArchivar(cap.id);
  }

  async function handleUpdateAsig(asigId: string, nuevoEstado: AsigEstado) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("empleado_capacitacion")
      .update({ estado: nuevoEstado })
      .eq("id", asigId);
    onUpdateAsig(asigId, nuevoEstado);
  }

  return (
    <div className={`bg-surface rounded-xl border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden transition-colors ${cap.estado === "archivada" ? "border-white/5 opacity-60" : "border-border"}`}>
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold truncate">{cap.titulo}</h3>
                {cap.obligatoria && (
                  <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    OBLIGATORIA
                  </span>
                )}
                {cap.estado === "archivada" && (
                  <span className="text-[10px] bg-border/10 text-secondary/60 px-2 py-0.5 rounded-full flex-shrink-0">
                    Archivada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catColor}`}>{cap.categoria}</span>
                <span className="text-xs text-secondary">
                  <Users size={10} className="inline mr-1" />{total} asignado{total !== 1 ? "s" : ""}
                </span>
                {cap.fecha_inicio && (
                  <span className="text-xs text-secondary/60">{fmtDate(cap.fecha_inicio)} – {fmtDate(cap.fecha_fin) ?? "…"}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {pct >= 90 ? (
              <span className="flex items-center gap-1 text-xs text-accent"><CheckCircle2 size={13} />Completada</span>
            ) : enCurso > 0 ? (
              <span className="flex items-center gap-1 text-xs text-yellow-400"><AlertCircle size={13} />En curso</span>
            ) : null}
            {cap.estado === "activa" && (
              <>
                <button
                  onClick={onAsignar}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <UserPlus size={12} />
                  Asignar
                </button>
                <button
                  onClick={handleArchivar}
                  disabled={archiving}
                  className="p-1.5 text-secondary/40 hover:text-secondary hover:bg-border/20 rounded-lg transition-colors"
                  title="Archivar"
                >
                  {archiving ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                </button>
              </>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 text-secondary/60 hover:text-white hover:bg-border/20 rounded-lg transition-colors"
              title={expanded ? "Colapsar" : "Ver progreso"}
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-secondary mb-1">
            <span>{completados} completado{completados !== 1 ? "s" : ""} de {total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%`, opacity: pct >= 90 ? 1 : 0.65 }}
            />
          </div>
        </div>
      </div>

      {/* Expanded: employee breakdown */}
      {expanded && (
        <div className="border-t border-border">
          {asignaciones.length === 0 ? (
            <div className="px-5 py-4 text-xs text-secondary/60 text-center">
              Sin empleados asignados aún.
            </div>
          ) : (
            <div className="divide-y divide-[#1A2235]">
              {asignaciones.map((asig) => {
                const emp = empMap[asig.empleado_id];
                const cfg = ASIG_CONFIG[asig.estado];
                return (
                  <div key={asig.id} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className="text-xs">{emp?.nombre ?? "—"}</span>
                    </div>
                    <select
                      value={asig.estado}
                      onChange={(e) => handleUpdateAsig(asig.id, e.target.value as AsigEstado)}
                      className={`text-[10px] bg-transparent border-0 focus:outline-none cursor-pointer ${cfg.color}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_curso">En curso</option>
                      <option value="completado">Completado</option>
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CapacitacionesPage() {
  const [loading, setLoading]               = useState(true);
  const [empresaId, setEmpresaId]           = useState<string | null>(null);
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [asignaciones, setAsignaciones]     = useState<Asignacion[]>([]);
  const [empleados, setEmpleados]           = useState<Empleado[]>([]);
  const [areas, setAreas]                   = useState<Area[]>([]);

  const [filterEstado, setFilterEstado] = useState<"activa" | "archivada" | "all">("activa");
  const [showNueva, setShowNueva]       = useState(false);
  const [asignandoId, setAsignandoId]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase
      .from("empleados").select("empresa_id").eq("user_id", user.id).single();
    if (!me) return;
    setEmpresaId(me.empresa_id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const [{ data: caps }, { data: asigs }, { data: emps }, { data: areasData }] =
      await Promise.all([
        db.from("capacitaciones")
          .select("id, titulo, descripcion, categoria, obligatoria, estado, fecha_inicio, fecha_fin, created_at")
          .eq("empresa_id", me.empresa_id)
          .order("created_at", { ascending: false }),
        db.from("empleado_capacitacion")
          .select("id, capacitacion_id, empleado_id, estado"),
        supabase.from("empleados").select("id, nombre, area_id")
          .eq("empresa_id", me.empresa_id).eq("activo", true).order("nombre"),
        supabase.from("areas").select("id, nombre")
          .eq("empresa_id", me.empresa_id).order("nombre"),
      ]);
    setCapacitaciones((caps ?? []) as Capacitacion[]);
    setAsignaciones((asigs ?? []) as Asignacion[]);
    setEmpleados(emps ?? []);
    setAreas(areasData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(
    () => filterEstado === "all" ? capacitaciones : capacitaciones.filter((c) => c.estado === filterEstado),
    [capacitaciones, filterEstado]
  );

  const totalInscriptos  = asignaciones.length;
  const totalCompletados = asignaciones.filter((a) => a.estado === "completado").length;
  const pctCompletion    = totalInscriptos > 0
    ? Math.round((totalCompletados / totalInscriptos) * 100) : 0;

  const asignarCap = capacitaciones.find((c) => c.id === asignandoId);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Capacitaciones</h1>
          <p className="text-secondary text-sm">
            Gestión de programas · {capacitaciones.filter((c) => c.estado === "activa").length} activos
          </p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          className="flex items-center gap-2 text-sm bg-accent text-[#0A0F1C] font-semibold px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Nueva capacitación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <div className="flex items-center gap-2 mb-2"><Users size={14} className="text-accent" /><p className="text-[10px] uppercase tracking-[0.7px] text-secondary">Inscripciones</p></div>
          <p className="text-[22px] font-extrabold text-accent">{totalInscriptos}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={14} className="text-green-400" /><p className="text-[10px] uppercase tracking-[0.7px] text-secondary">Completadas</p></div>
          <p className="text-[22px] font-extrabold text-green-400">{totalCompletados}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-blue-400" /><p className="text-[10px] uppercase tracking-[0.7px] text-secondary">Tasa completitud</p></div>
          <p className="text-[22px] font-extrabold text-blue-400">{pctCompletion}%</p>
        </div>
      </div>

      {/* Filters */}
      {!loading && (
        <div className="flex items-center gap-2 mb-5">
          {(["activa", "archivada", "all"] as const).map((e) => (
            <button
              key={e}
              onClick={() => setFilterEstado(e)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                filterEstado === e
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-secondary hover:text-white hover:bg-border/20"
              }`}
            >
              {e === "activa" ? `Activas (${capacitaciones.filter((c) => c.estado === "activa").length})`
               : e === "archivada" ? `Archivadas (${capacitaciones.filter((c) => c.estado === "archivada").length})`
               : `Todas (${capacitaciones.length})`}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-surface rounded-xl border border-border animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-10 text-center">
          <BookOpen size={32} className="text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-secondary">No hay capacitaciones aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cap) => {
            const asigsCap = asignaciones.filter((a) => a.capacitacion_id === cap.id);
            const asignadosSet = new Set(asigsCap.map((a) => a.empleado_id));
            return (
              <CapacitacionCard
                key={cap.id}
                cap={cap}
                asignaciones={asigsCap}
                empleados={empleados}
                areas={areas}
                onAsignar={() => setAsignandoId(cap.id)}
                onArchivar={(id) =>
                  setCapacitaciones((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, estado: "archivada" } : c))
                  )
                }
                onUpdateAsig={(asigId, estado) =>
                  setAsignaciones((prev) =>
                    prev.map((a) => (a.id === asigId ? { ...a, estado } : a))
                  )
                }
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showNueva && empresaId && (
        <NuevaCapacitacionModal
          empresaId={empresaId}
          onClose={() => setShowNueva(false)}
          onCreated={(c) => setCapacitaciones((prev) => [c, ...prev])}
        />
      )}
      {asignarCap && empresaId && (
        <AsignarModal
          capacitacion={asignarCap}
          empleados={empleados}
          areas={areas}
          asignados={new Set(asignaciones.filter((a) => a.capacitacion_id === asignarCap.id).map((a) => a.empleado_id))}
          onClose={() => setAsignandoId(null)}
          onAsignado={(nuevas) => {
            setAsignaciones((prev) => [...prev, ...nuevas]);
            setAsignandoId(null);
          }}
        />
      )}
    </div>
  );
}
