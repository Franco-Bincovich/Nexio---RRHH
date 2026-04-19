"use client";
import { useState, useRef, useTransition } from "react";
import {
  Building2,
  FileText,
  Bell,
  Users,
  KeyRound,
  Save,
  Check,
  Loader2,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  guardarDatosEmpresa,
  guardarPoliticas,
  guardarNotificaciones,
  importarEmpleados,
} from "./actions";
import type { EmpresaConfig } from "./page";
import type { ImportRow, ImportResult } from "./actions";

// ── Shared UI ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors";
const selectCls =
  "w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50 transition-colors";

function SectionCard({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-[10px] text-secondary/60 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full relative flex-shrink-0 transition-colors ${value ? "bg-accent" : "bg-white/15"}`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function SaveRow({
  isPending,
  saved,
  error,
  onSave,
  label = "Guardar",
}: {
  isPending: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
      {error ? (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      ) : saved ? (
        <p className="text-xs text-accent flex items-center gap-1">
          <Check size={12} />
          Guardado
        </p>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-[#0A0F1C] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {label}
      </button>
    </div>
  );
}

// ── CSV Parser ─────────────────────────────────────────────────────────────────

const CSV_HEADERS = ["nombre", "email", "area", "rol", "modalidad", "horas"];
const CSV_EXAMPLE = `nombre,email,area,rol,modalidad,horas
Ana García,ana@empresa.com,Tecnología,empleado,presencial,8
Carlos López,carlos@empresa.com,Comercial,lider,hibrido,8`;

function parseCSV(text: string): { rows: string[][]; sep: "," | ";" } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sep: "," | ";" = lines[0]?.includes(";") ? ";" : ",";
  return {
    rows: lines.map((l) =>
      l.split(sep).map((cell) => cell.replace(/^"|"$/g, "").trim())
    ),
    sep,
  };
}

function isHeaderRow(row: string[]): boolean {
  return (
    row[0]?.toLowerCase().includes("nombre") ||
    row[1]?.toLowerCase().includes("email")
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  empresaNombre: string;
  config: EmpresaConfig;
  areas: { id: string; nombre: string }[];
}

export default function ConfiguracionClient({
  empresaNombre,
  config: initialConfig,
  areas,
}: Props) {
  // ── Datos empresa ──
  const [nombre, setNombre] = useState(empresaNombre);
  const [logoUrl, setLogoUrl] = useState(initialConfig.logo_url ?? "");
  const [empPending, startEmpTransition] = useTransition();
  const [empSaved, setEmpSaved] = useState(false);
  const [empError, setEmpError] = useState("");

  // ── Políticas ──
  const [diasVac, setDiasVac]   = useState(initialConfig.dias_vacaciones);
  const [horaIn, setHoraIn]     = useState(initialConfig.hora_entrada.slice(0, 5));
  const [horaOut, setHoraOut]   = useState(initialConfig.hora_salida.slice(0, 5));
  const [modalidades, setModalidades] = useState<string[]>(initialConfig.modalidades_habilitadas);
  const [passDefault, setPassDefault] = useState(initialConfig.password_default);
  const [showPass, setShowPass] = useState(false);
  const [polPending, startPolTransition] = useTransition();
  const [polSaved, setPolSaved] = useState(false);
  const [polError, setPolError] = useState("");

  // ── Notificaciones ──
  const [notifs, setNotifs] = useState({
    notif_ausentismo:         initialConfig.notif_ausentismo,
    notif_objetivos_vencidos: initialConfig.notif_objetivos_vencidos,
    notif_resumen_semanal:    initialConfig.notif_resumen_semanal,
    notif_nuevos_empleados:   initialConfig.notif_nuevos_empleados,
  });
  const [notifPending, startNotifTransition] = useTransition();
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifError, setNotifError] = useState("");

  // ── CSV import ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows]         = useState<ImportRow[] | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvError, setCsvError]       = useState("");
  const [importing, startImportTransition] = useTransition();
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  // ── Handlers ──

  function handleSaveEmpresa() {
    setEmpSaved(false);
    setEmpError("");
    startEmpTransition(async () => {
      const res = await guardarDatosEmpresa(nombre, logoUrl.trim() || null);
      if (res.error) setEmpError(res.error);
      else setEmpSaved(true);
    });
  }

  function toggleModalidad(m: string) {
    setModalidades((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  function handleSavePoliticas() {
    setPolSaved(false);
    setPolError("");
    startPolTransition(async () => {
      const res = await guardarPoliticas({
        dias_vacaciones: diasVac,
        hora_entrada: horaIn,
        hora_salida: horaOut,
        modalidades_habilitadas: modalidades,
        password_default: passDefault.trim(),
      });
      if (res.error) setPolError(res.error);
      else setPolSaved(true);
    });
  }

  function handleToggleNotif(key: keyof typeof notifs) {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    setNotifSaved(false);
    setNotifError("");
    startNotifTransition(async () => {
      const res = await guardarNotificaciones(updated);
      if (res.error) setNotifError(res.error);
      else setNotifSaved(true);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvError("");
    setCsvRows(null);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const { rows } = parseCSV(text);
        if (rows.length === 0) { setCsvError("El archivo está vacío."); return; }

        let dataRows = rows;
        if (isHeaderRow(rows[0])) dataRows = rows.slice(1);
        if (dataRows.length === 0) { setCsvError("No hay datos después de la cabecera."); return; }

        const parsed: ImportRow[] = dataRows
          .filter((r) => r[0] && r[1])
          .map((r) => ({
            nombre:          r[0] ?? "",
            email:           r[1] ?? "",
            area_nombre:     r[2] ?? "",
            rol:             r[3] ?? "empleado",
            modalidad:       r[4] ?? "presencial",
            horas_laborables: parseInt(r[5] ?? "8") || 8,
            password:        passDefault,
          }));

        if (parsed.length === 0) { setCsvError("No se encontraron filas válidas (nombre + email requeridos)."); return; }
        setCsvRows(parsed);
      } catch {
        setCsvError("No se pudo parsear el archivo CSV.");
      }
    };
    reader.readAsText(file);
  }

  function handleConfirmImport() {
    if (!csvRows) return;
    setImportResults(null);
    startImportTransition(async () => {
      const { results, error } = await importarEmpleados(csvRows);
      if (error) { setCsvError(error); return; }
      setImportResults(results);
      setCsvRows(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleCancelImport() {
    setCsvRows(null);
    setCsvFileName("");
    setCsvError("");
    setImportResults(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const importOk  = importResults?.filter((r) => r.ok).length ?? 0;
  const importErr = importResults?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold mb-1">Configuración</h1>
        <p className="text-secondary text-sm">Ajustes generales de la plataforma</p>
      </div>

      {/* ── 1. Datos de la empresa ─────────────────────────────── */}
      <SectionCard
        icon={<Building2 size={16} />}
        iconColor="text-accent"
        iconBg="bg-accent/10"
        title="Datos de la empresa"
        description="Nombre e imagen que aparecen en el panel"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-secondary block mb-1.5">Nombre de la empresa</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setEmpSaved(false); }}
              className={inputCls}
              placeholder="Nombre de tu empresa"
            />
          </div>
          <div>
            <label className="text-xs text-secondary block mb-1.5">URL del logo <span className="text-secondary/40">(opcional)</span></label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => { setLogoUrl(e.target.value); setEmpSaved(false); }}
              className={inputCls}
              placeholder="https://…/logo.png"
            />
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo preview"
                onError={(e) => (e.currentTarget.style.display = "none")}
                className="mt-2 h-10 object-contain rounded"
              />
            )}
          </div>
        </div>
        <SaveRow
          isPending={empPending}
          saved={empSaved}
          error={empError}
          onSave={handleSaveEmpresa}
        />
      </SectionCard>

      {/* ── 2. Políticas de RRHH + Contraseña ────────────────── */}
      <SectionCard
        icon={<FileText size={16} />}
        iconColor="text-purple-400"
        iconBg="bg-purple-400/10"
        title="Políticas de RRHH"
        description="Horarios, vacaciones, modalidades habilitadas y contraseña por defecto"
      >
        <div className="space-y-5">
          {/* Vacation days */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-secondary block mb-1.5">Días de vacaciones / año</label>
              <input
                type="number"
                min={0}
                max={365}
                value={diasVac}
                onChange={(e) => { setDiasVac(Number(e.target.value)); setPolSaved(false); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1.5">Hora de entrada</label>
              <input
                type="time"
                value={horaIn}
                onChange={(e) => { setHoraIn(e.target.value); setPolSaved(false); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1.5">Hora de salida</label>
              <input
                type="time"
                value={horaOut}
                onChange={(e) => { setHoraOut(e.target.value); setPolSaved(false); }}
                className={inputCls}
              />
            </div>
          </div>

          {/* Modalidades */}
          <div>
            <label className="text-xs text-secondary block mb-2">Modalidades habilitadas</label>
            <div className="flex gap-3">
              {(["presencial", "remoto", "hibrido"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalidades.includes(m)}
                    onChange={() => { toggleModalidad(m); setPolSaved(false); }}
                    className="accent-[#3ECFB2] w-3.5 h-3.5"
                  />
                  <span className="text-sm capitalize">{m}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Password default */}
          <div>
            <label className="text-xs text-secondary block mb-1.5">
              Contraseña por defecto para nuevos empleados
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={passDefault}
                onChange={(e) => { setPassDefault(e.target.value); setPolSaved(false); }}
                className={`${inputCls} pr-10 font-mono`}
                placeholder="nexio1234"
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
            <p className="text-[10px] text-secondary/50 mt-1">
              Esta contraseña se usa como valor por defecto al crear un empleado. RRHH puede cambiarla por empleado en el modal de creación.
            </p>
          </div>
        </div>

        <SaveRow
          isPending={polPending}
          saved={polSaved}
          error={polError}
          onSave={handleSavePoliticas}
        />
      </SectionCard>

      {/* ── 3. Notificaciones ────────────────────────────────── */}
      <SectionCard
        icon={<Bell size={16} />}
        iconColor="text-yellow-400"
        iconBg="bg-yellow-400/10"
        title="Notificaciones"
        description="Controlá qué alertas se envían a nivel empresa"
      >
        <div className="space-y-0 divide-y divide-border">
          {(
            [
              ["notif_ausentismo",         "Alertas por ausentismo repetido"],
              ["notif_objetivos_vencidos", "Notificar cuando vence un objetivo"],
              ["notif_resumen_semanal",    "Resumen semanal al equipo RRHH"],
              ["notif_nuevos_empleados",   "Notificar al dar de alta un empleado"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm">{label}</p>
                {notifPending && <p className="text-[10px] text-secondary/40">Guardando…</p>}
              </div>
              <Toggle
                value={notifs[key]}
                onChange={() => handleToggleNotif(key)}
              />
            </div>
          ))}
        </div>
        {notifError && (
          <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
            <AlertCircle size={12} />
            {notifError}
          </p>
        )}
        {notifSaved && !notifPending && (
          <p className="text-xs text-accent mt-3 flex items-center gap-1">
            <Check size={12} />
            Guardado automáticamente
          </p>
        )}
      </SectionCard>

      {/* ── 4. Importación masiva ────────────────────────────── */}
      <SectionCard
        icon={<Users size={16} />}
        iconColor="text-blue-400"
        iconBg="bg-blue-400/10"
        title="Importación masiva"
        description="Subí un CSV para dar de alta múltiples empleados de una vez"
      >
        {/* Format description */}
        <div className="bg-base border border-border rounded-lg p-4 mb-5">
          <p className="text-xs text-secondary mb-2 font-medium">Formato esperado del CSV:</p>
          <pre className="text-[11px] text-secondary/70 font-mono leading-relaxed overflow-x-auto">
            {CSV_EXAMPLE}
          </pre>
          <p className="text-[10px] text-secondary/50 mt-2">
            Columnas: <span className="font-mono">{CSV_HEADERS.join(", ")}</span> · La primera fila de encabezado es opcional · Separador: coma o punto y coma · Campos opcionales: area, rol (def. empleado), modalidad (def. presencial), horas (def. 8)
          </p>
        </div>

        {/* File input */}
        {!csvRows && !importResults && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="flex items-center justify-center gap-3 border-2 border-dashed border-border hover:border-accent/40 rounded-xl py-8 cursor-pointer transition-colors group"
            >
              <Upload size={20} className="text-secondary/40 group-hover:text-accent/60 transition-colors" />
              <span className="text-sm text-secondary/60 group-hover:text-secondary transition-colors">
                Hacé clic para seleccionar un archivo CSV
              </span>
            </label>
            {csvError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                {csvError}
              </p>
            )}
          </div>
        )}

        {/* Preview */}
        {csvRows && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                Vista previa · {csvRows.length} empleado{csvRows.length !== 1 ? "s" : ""} a importar
                <span className="text-xs text-secondary font-normal ml-2">({csvFileName})</span>
              </p>
              <button
                onClick={handleCancelImport}
                className="text-xs text-secondary hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X size={13} />
                Cancelar
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.7px] text-secondary bg-base/50">
                    {["Nombre", "Email", "Área", "Rol", "Modalidad", "Horas"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-border/10">
                      <td className="px-3 py-2 font-medium">{row.nombre}</td>
                      <td className="px-3 py-2 text-secondary/80">{row.email}</td>
                      <td className="px-3 py-2 text-secondary/60">{row.area_nombre || "—"}</td>
                      <td className="px-3 py-2 text-secondary/60 capitalize">{row.rol}</td>
                      <td className="px-3 py-2 text-secondary/60 capitalize">{row.modalidad}</td>
                      <td className="px-3 py-2 text-secondary/60">{row.horas_laborables}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                {csvError}
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-accent text-[#0A0F1C] font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
              >
                {importing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {importing ? "Importando…" : `Confirmar importación (${csvRows.length})`}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {importResults && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-accent text-sm">
                <CheckCircle2 size={16} />
                <span className="font-semibold">{importOk} creado{importOk !== 1 ? "s" : ""}</span>
              </div>
              {importErr > 0 && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span className="font-semibold">{importErr} error{importErr !== 1 ? "es" : ""}</span>
                </div>
              )}
            </div>
            {importErr > 0 && (
              <div className="space-y-1 mb-4">
                {importResults
                  .filter((r) => !r.ok)
                  .map((r, i) => (
                    <div key={i} className="bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-red-400">{r.nombre} ({r.email})</p>
                      <p className="text-[10px] text-red-400/70 mt-0.5">{r.error}</p>
                    </div>
                  ))}
              </div>
            )}
            <button
              onClick={handleCancelImport}
              className="text-xs text-secondary hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Upload size={13} />
              Importar otro archivo
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
