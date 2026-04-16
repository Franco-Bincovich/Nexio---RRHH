"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import {
  ClipboardList,
  Star,
  Clock,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  Calendar,
  Search,
  ChevronDown,
  Trash2,
  User,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Estado = "pendiente" | "completada";

type Evaluacion = {
  id: string;
  empleado_id: string;
  evaluador_id: string | null;
  tipo: string;
  puntuacion: number | null;
  comentario: string | null;
  fecha: string;
  estado: Estado;
  created_at: string;
};

type Empleado = { id: string; nombre: string; area_id: string | null };
type Area = { id: string; nombre: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPOS = ["desempeño", "360", "semestral", "anual", "onboarding"] as const;

const TIPO_COLOR: Record<string, string> = {
  "desempeño":  "bg-yellow-500/10 text-yellow-400",
  "360":        "bg-blue-500/10 text-blue-400",
  "semestral":  "bg-purple-500/10 text-purple-400",
  "anual":      "bg-accent/10 text-accent",
  "onboarding": "bg-green-500/10 text-green-400",
};

const TIPO_LABEL: Record<string, string> = {
  "desempeño":  "Desempeño",
  "360":        "360°",
  "semestral":  "Semestral",
  "anual":      "Anual",
  "onboarding": "Onboarding",
};

function scoreColor(s: number) {
  if (s >= 8.5) return "text-accent";
  if (s >= 7)   return "text-yellow-400";
  return "text-red-400";
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.7px] text-secondary">
          {label}
        </p>
      </div>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

// ── Nueva evaluación modal ────────────────────────────────────────────────────

function NuevaModal({
  empresaId,
  empleados,
  areas,
  onClose,
  onCreated,
}: {
  empresaId: string;
  empleados: Empleado[];
  areas: Area[];
  onClose: () => void;
  onCreated: (ev: Evaluacion) => void;
}) {
  const [empleadoId, setEmpleadoId]   = useState("");
  const [evaluadorId, setEvaluadorId] = useState("");
  const [tipo, setTipo]               = useState<string>("desempeño");
  const [fecha, setFecha]             = useState(new Date().toISOString().split("T")[0]);
  const [puntuacion, setPuntuacion]   = useState("");
  const [comentario, setComentario]   = useState("");
  const [filterArea, setFilterArea]   = useState("all");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const empsFiltrados = filterArea === "all"
    ? empleados
    : empleados.filter((e) => e.area_id === filterArea);

  async function handleSave() {
    if (!empleadoId) { setError("Seleccioná un empleado."); return; }
    const pun = puntuacion ? parseFloat(puntuacion) : null;
    if (pun !== null && (pun < 1 || pun > 10)) {
      setError("La puntuación debe estar entre 1 y 10.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error: err } = await db
      .from("evaluaciones")
      .insert({
        empresa_id:   empresaId,
        empleado_id:  empleadoId,
        evaluador_id: evaluadorId || null,
        tipo,
        puntuacion:   pun,
        comentario:   comentario.trim() || null,
        fecha,
        estado:       pun !== null ? "completada" : "pendiente",
      })
      .select()
      .single();
    if (err) { setError(err.message); setSaving(false); return; }
    onCreated(data as Evaluacion);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Nueva evaluación</h2>
          <button onClick={onClose} className="p-1 text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Area filter + Empleado */}
          <div>
            <label className="block text-xs text-secondary mb-1.5">Empleado</label>
            <div className="flex gap-2 mb-2">
              <select
                value={filterArea}
                onChange={(e) => { setFilterArea(e.target.value); setEmpleadoId(""); }}
                className="flex-1 bg-base border border-border text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-accent/50"
              >
                <option value="all">Todas las áreas</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
            >
              <option value="">Seleccionar empleado…</option>
              {empsFiltrados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>

          {/* Tipo + Evaluador */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1.5">Evaluador <span className="text-secondary/40">(opcional)</span></label>
              <select
                value={evaluadorId}
                onChange={(e) => setEvaluadorId(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
              >
                <option value="">Sin asignar</option>
                {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Fecha + Puntuacion */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1.5">
                Puntuación (1–10) <span className="text-secondary/40">(opcional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={puntuacion}
                onChange={(e) => setPuntuacion(e.target.value)}
                placeholder="Completar si disponible"
                className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-secondary/30"
              />
              <p className="text-[10px] text-secondary/50 mt-1">Con puntuación → estado "Completada"</p>
            </div>
          </div>

          {/* Comentario */}
          <div>
            <label className="block text-xs text-secondary mb-1.5">Comentario <span className="text-secondary/40">(opcional)</span></label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Observaciones sobre el desempeño…"
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50 placeholder:text-secondary/40"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !empleadoId}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-[#0A0F1C] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Crear evaluación
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Completar modal ───────────────────────────────────────────────────────────

function CompletarModal({
  evaluacion,
  empleados,
  onClose,
  onCompleted,
}: {
  evaluacion: Evaluacion;
  empleados: Empleado[];
  onClose: () => void;
  onCompleted: (id: string, puntuacion: number, comentario: string) => void;
}) {
  const [puntuacion, setPuntuacion] = useState("");
  const [comentario, setComentario] = useState(evaluacion.comentario ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const emp = empleados.find((e) => e.id === evaluacion.empleado_id);

  async function handleSave() {
    const pun = parseFloat(puntuacion);
    if (!puntuacion || isNaN(pun) || pun < 1 || pun > 10) {
      setError("Ingresá una puntuación entre 1 y 10.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error: err } = await db
      .from("evaluaciones")
      .update({ puntuacion: pun, comentario: comentario.trim() || null, estado: "completada" })
      .eq("id", evaluacion.id);
    if (err) { setError(err.message); setSaving(false); return; }
    onCompleted(evaluacion.id, pun, comentario.trim());
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Completar evaluación</h2>
          <button onClick={onClose} className="p-1 text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-secondary mb-4">
          <span className="font-medium text-white">{emp?.nombre ?? "—"}</span> ·{" "}
          <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLOR[evaluacion.tipo] ?? ""}`}>
            {TIPO_LABEL[evaluacion.tipo] ?? evaluacion.tipo}
          </span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Puntuación (1–10)</label>
            <input
              type="number"
              min="1"
              max="10"
              step="0.1"
              value={puntuacion}
              onChange={(e) => setPuntuacion(e.target.value)}
              placeholder="ej. 8.5"
              autoFocus
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent/50 placeholder:text-secondary/40"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1.5">Comentario <span className="text-secondary/40">(opcional)</span></label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="w-full bg-base border border-border text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-[#0A0F1C] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Completar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function EvaluacionesPage() {
  const [loading, setLoading]           = useState(true);
  const [empresaId, setEmpresaId]       = useState<string | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [empleados, setEmpleados]       = useState<Empleado[]>([]);
  const [areas, setAreas]               = useState<Area[]>([]);

  const [filterEstado, setFilterEstado] = useState<"all" | Estado>("all");
  const [searchEmp, setSearchEmp]       = useState("");
  const [showNueva, setShowNueva]       = useState(false);
  const [completando, setCompletando]   = useState<Evaluacion | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

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
    const [{ data: evs }, { data: emps }, { data: areasData }] = await Promise.all([
      db.from("evaluaciones")
        .select("id, empleado_id, evaluador_id, tipo, puntuacion, comentario, fecha, estado, created_at")
        .eq("empresa_id", me.empresa_id)
        .order("fecha", { ascending: false }),
      supabase.from("empleados").select("id, nombre, area_id")
        .eq("empresa_id", me.empresa_id).eq("activo", true).order("nombre"),
      supabase.from("areas").select("id, nombre")
        .eq("empresa_id", me.empresa_id).order("nombre"),
    ]);
    setEvaluaciones((evs ?? []) as Evaluacion[]);
    setEmpleados(emps ?? []);
    setAreas(areasData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const empMap  = useMemo(() => Object.fromEntries(empleados.map((e) => [e.id, e])), [empleados]);
  const areaMap = useMemo(() => Object.fromEntries(areas.map((a) => [a.id, a.nombre])), [areas]);

  const filtered = useMemo(() => {
    return evaluaciones.filter((ev) => {
      if (filterEstado !== "all" && ev.estado !== filterEstado) return false;
      if (searchEmp) {
        const nombre = empMap[ev.empleado_id]?.nombre?.toLowerCase() ?? "";
        if (!nombre.includes(searchEmp.toLowerCase())) return false;
      }
      return true;
    });
  }, [evaluaciones, filterEstado, searchEmp, empMap]);

  const pendientes   = evaluaciones.filter((e) => e.estado === "pendiente");
  const completadas  = evaluaciones.filter((e) => e.estado === "completada");
  const promedio     = completadas.length
    ? (completadas.reduce((a, e) => a + (e.puntuacion ?? 0), 0) / completadas.filter((e) => e.puntuacion).length).toFixed(1)
    : null;

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("evaluaciones").delete().eq("id", id);
    setEvaluaciones((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Evaluaciones</h1>
          <p className="text-secondary text-sm">
            Gestión de evaluaciones de desempeño · {evaluaciones.length} total
          </p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          className="flex items-center gap-2 text-sm bg-accent text-[#0A0F1C] font-semibold px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Nueva evaluación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Clock size={14} className="text-yellow-400" />} label="Pendientes" value={pendientes.length} color="text-yellow-400" />
        <StatCard icon={<CheckCircle2 size={14} className="text-accent" />} label="Completadas" value={completadas.length} color="text-accent" />
        <StatCard icon={<Star size={14} className="text-blue-400" />} label="Promedio" value={promedio ?? "—"} color="text-blue-400" />
      </div>

      {/* Filters */}
      {!loading && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {(["all", "pendiente", "completada"] as const).map((e) => (
            <button
              key={e}
              onClick={() => setFilterEstado(e)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                filterEstado === e
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-secondary hover:text-white hover:bg-border/20"
              }`}
            >
              {e === "all" ? `Todas (${evaluaciones.length})` : e === "pendiente" ? `Pendientes (${pendientes.length})` : `Completadas (${completadas.length})`}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary/50" />
            <input
              value={searchEmp}
              onChange={(e) => setSearchEmp(e.target.value)}
              placeholder="Buscar empleado…"
              className="bg-base border border-border text-xs rounded-lg pl-7 pr-3 py-1.5 w-44 focus:outline-none focus:border-accent/40 placeholder:text-secondary/40"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-12 bg-surface rounded-xl border border-border animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-10 text-center">
          <ClipboardList size={32} className="text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-secondary">No hay evaluaciones con estos filtros.</p>
        </div>
      ) : (
        <>
          {/* Pendientes table */}
          {(filterEstado === "all" || filterEstado === "pendiente") && filtered.filter((e) => e.estado === "pendiente").length > 0 && (
            <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Clock size={15} className="text-yellow-400" />
                <h2 className="text-sm font-semibold">Pendientes</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                    <th className="text-left px-5 py-2.5 font-medium">Empleado</th>
                    <th className="text-left px-5 py-2.5 font-medium">Evaluador</th>
                    <th className="text-left px-5 py-2.5 font-medium">Tipo</th>
                    <th className="text-left px-5 py-2.5 font-medium">Fecha</th>
                    <th className="text-right px-5 py-2.5 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((e) => e.estado === "pendiente").map((ev) => {
                    const emp  = empMap[ev.empleado_id];
                    const eval_ = ev.evaluador_id ? empMap[ev.evaluador_id] : null;
                    return (
                      <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-border/10 transition-colors">
                        <td className="px-5 py-3 text-xs">
                          <span className="font-medium">{emp?.nombre ?? "—"}</span>
                          {emp?.area_id && <span className="text-secondary font-normal ml-1.5">{areaMap[emp.area_id] ?? ""}</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-secondary">{eval_?.nombre ?? <span className="text-secondary/40">Sin asignar</span>}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLOR[ev.tipo] ?? "bg-border/10 text-secondary"}`}>
                            {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-secondary">
                          <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(ev.fecha)}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setCompletando(ev)}
                              className="text-xs px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
                            >
                              Completar
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              disabled={deletingId === ev.id}
                              className="p-1 text-secondary/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              {deletingId === ev.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Completadas table */}
          {(filterEstado === "all" || filterEstado === "completada") && filtered.filter((e) => e.estado === "completada").length > 0 && (
            <div className="bg-surface rounded-xl border border-border shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <CheckCircle2 size={15} className="text-accent" />
                <h2 className="text-sm font-semibold">Completadas</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary">
                    <th className="text-left px-5 py-2.5 font-medium">Empleado</th>
                    <th className="text-left px-5 py-2.5 font-medium">Tipo</th>
                    <th className="text-left px-5 py-2.5 font-medium">Fecha</th>
                    <th className="text-left px-5 py-2.5 font-medium">Comentario</th>
                    <th className="text-right px-5 py-2.5 font-medium">Score</th>
                    <th className="text-right px-5 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((e) => e.estado === "completada").map((ev) => {
                    const emp = empMap[ev.empleado_id];
                    return (
                      <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-border/10 transition-colors">
                        <td className="px-5 py-3 text-xs">
                          <span className="font-medium">{emp?.nombre ?? "—"}</span>
                          {emp?.area_id && <span className="text-secondary font-normal ml-1.5">{areaMap[emp.area_id] ?? ""}</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLOR[ev.tipo] ?? ""}`}>
                            {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-secondary">{fmtDate(ev.fecha)}</td>
                        <td className="px-5 py-3 text-xs text-secondary/60 max-w-[200px]">
                          <span className="truncate block">{ev.comentario ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {ev.puntuacion != null ? (
                            <span className={`text-sm font-bold ${scoreColor(ev.puntuacion)}`}>{ev.puntuacion}</span>
                          ) : (
                            <span className="text-xs text-secondary/40">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDelete(ev.id)}
                            disabled={deletingId === ev.id}
                            className="p-1 text-secondary/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            {deletingId === ev.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showNueva && empresaId && (
        <NuevaModal
          empresaId={empresaId}
          empleados={empleados}
          areas={areas}
          onClose={() => setShowNueva(false)}
          onCreated={(ev) => setEvaluaciones((prev) => [ev, ...prev])}
        />
      )}
      {completando && (
        <CompletarModal
          evaluacion={completando}
          empleados={empleados}
          onClose={() => setCompletando(null)}
          onCompleted={(id, pun, com) =>
            setEvaluaciones((prev) =>
              prev.map((e) =>
                e.id === id ? { ...e, puntuacion: pun, comentario: com, estado: "completada" } : e
              )
            )
          }
        />
      )}
    </div>
  );
}
