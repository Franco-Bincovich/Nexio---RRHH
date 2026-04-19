"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, Save, Loader2, CheckCircle2, AlertCircle,
  Upload, FileText, Trash2, Bell,
} from "lucide-react";
import {
  guardarPerfilLider,
  subirAvatarLider,
  subirDocumentoLider,
  eliminarDocumentoLider,
  guardarPreferenciasNotifLider,
} from "./actions";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  avatar_url: string | null;
}

interface Documento {
  name: string;
  created_at: string;
  id: string;
  updated_at: string;
}

interface NotifPrefs {
  inasistencias: boolean;
  objetivos: boolean;
  vacaciones: boolean;
  capacitaciones: boolean;
}

interface Props {
  empleado:    Empleado;
  userId:      string;
  documentos:  Documento[];
  notifPrefs:  NotifPrefs;
}

export default function PerfilLiderClient({ empleado, userId, documentos: initialDocs, notifPrefs: initialPrefs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formMsg,   setFormMsg]   = useState<{ ok?: boolean; error?: string } | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [docMsg,    setDocMsg]    = useState<{ ok?: boolean; error?: string } | null>(null);
  const [docs,          setDocs]         = useState(initialDocs);
  const [deletingDoc,   setDeletingDoc]  = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(empleado.avatar_url);
  const [prefs,     setPrefs]     = useState<NotifPrefs>(initialPrefs);
  const [prefsMsg,  setPrefsMsg]  = useState<{ ok?: boolean; error?: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef    = useRef<HTMLInputElement>(null);

  const initials = empleado.nombre
    .split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  async function handleGuardarPerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await guardarPerfilLider(fd);
      setFormMsg(res);
      if (res.ok) router.refresh();
    });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarMsg(null);
    setAvatarPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("avatar", file);
    startTransition(async () => {
      const res = await subirAvatarLider(fd);
      if (res.error) { setAvatarMsg({ error: res.error }); setAvatarPreview(empleado.avatar_url); }
      else { setAvatarMsg({ ok: true }); router.refresh(); }
    });
  }

  async function handleSubirDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocMsg(null);
    const fd = new FormData();
    fd.append("documento", file);
    startTransition(async () => {
      const res = await subirDocumentoLider(fd);
      if (res.error) setDocMsg({ error: res.error });
      else {
        setDocMsg({ ok: true });
        router.refresh();
        setDocs((prev) => [
          { name: file.name, created_at: new Date().toISOString(), id: res.path!, updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }
      e.target.value = "";
    });
  }

  function handleTogglePref(key: keyof NotifPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setPrefsMsg(null);
    startTransition(async () => {
      const res = await guardarPreferenciasNotifLider(updated);
      setPrefsMsg(res);
    });
  }

  async function handleEliminarDoc(doc: Documento) {
    setDeletingDoc(doc.name);
    const path = `${userId}/${doc.name}`;
    const res = await eliminarDocumentoLider(path);
    setDeletingDoc(null);
    if (res.error) setDocMsg({ error: res.error });
    else setDocs((prev) => prev.filter((d) => d.name !== doc.name));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Foto de perfil */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-sm font-semibold mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-5">
          <div className="relative group flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full border-2 border-accent/25 bg-accent/10 overflow-hidden flex items-center justify-center text-2xl font-bold text-accent cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-base flex items-center justify-center hover:bg-accent/80 transition-colors"
              aria-label="Cambiar foto"
            >
              <Camera size={13} />
            </button>
          </div>
          <div>
            <p className="text-sm text-secondary mb-2">JPG o PNG, máximo 3 MB</p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-xs text-accent hover:underline"
            >
              Cambiar foto
            </button>
            {avatarMsg?.ok && (
              <p className="flex items-center gap-1 text-xs text-accent mt-1"><CheckCircle2 size={12} />Foto actualizada</p>
            )}
            {avatarMsg?.error && (
              <p className="flex items-center gap-1 text-xs text-red-400 mt-1"><AlertCircle size={12} />{avatarMsg.error}</p>
            )}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* Formulario de datos */}
      <form onSubmit={handleGuardarPerfil}>
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Datos personales</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombre completo" name="nombre" defaultValue={empleado.nombre} required />
              <Field label="Email" name="email" type="email" defaultValue={empleado.email} disabled />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Teléfono" name="telefono" type="tel" defaultValue={empleado.telefono ?? ""} placeholder="+54 11 1234-5678" />
              <Field label="Dirección" name="direccion" defaultValue={empleado.direccion ?? ""} placeholder="Av. Corrientes 1234, CABA" />
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-3">Contacto de emergencia</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nombre" name="contacto_emergencia_nombre" defaultValue={empleado.contacto_emergencia_nombre ?? ""} placeholder="Juan Pérez" />
                <Field label="Teléfono" name="contacto_emergencia_telefono" type="tel" defaultValue={empleado.contacto_emergencia_telefono ?? ""} placeholder="+54 11 9876-5432" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
            {formMsg?.ok && (
              <span className="flex items-center gap-1.5 text-xs text-accent"><CheckCircle2 size={13} />Cambios guardados</span>
            )}
            {formMsg?.error && (
              <span className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={13} />{formMsg.error}</span>
            )}
            {!formMsg && <span />}
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Guardar cambios
            </button>
          </div>
        </div>
      </form>

      {/* Mis documentos */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Mis documentos</h2>
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Upload size={12} />
            Subir archivo
          </button>
          <input
            ref={docInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
            className="hidden"
            onChange={handleSubirDoc}
          />
        </div>
        <div className="px-6 py-2">
          {docMsg?.ok && (
            <div className="flex items-center gap-1.5 text-xs text-accent py-2"><CheckCircle2 size={12} />Archivo subido correctamente</div>
          )}
          {docMsg?.error && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 py-2"><AlertCircle size={12} />{docMsg.error}</div>
          )}
          <p className="text-[10px] text-secondary/50 py-2">JPG, PNG, PDF, DOCX, XLSX · máx. 10 MB</p>
        </div>
        {docs.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <FileText size={24} className="text-secondary/30 mx-auto mb-2" />
            <p className="text-sm text-secondary/60">No hay documentos subidos todavía.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((doc) => (
              <li key={doc.name} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-border/20">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={15} className="text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{doc.name}</p>
                    <p className="text-[10px] text-secondary/50">
                      {new Date(doc.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEliminarDoc(doc)}
                  disabled={deletingDoc === doc.name}
                  className="text-secondary hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-50"
                  aria-label="Eliminar documento"
                >
                  {deletingDoc === doc.name ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Preferencias de notificaciones */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Bell size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Preferencias de notificaciones</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          {(
            [
              { key: "inasistencias",  label: "Inasistencias" },
              { key: "objetivos",      label: "Objetivos" },
              { key: "vacaciones",     label: "Vacaciones" },
              { key: "capacitaciones", label: "Capacitaciones" },
            ] as { key: keyof NotifPrefs; label: string }[]
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm">Recibir notificaciones de {label.toLowerCase()}</span>
              <button
                type="button"
                onClick={() => handleTogglePref(key)}
                disabled={isPending}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${prefs[key] ? "bg-accent" : "bg-white/15"}`}
                aria-checked={prefs[key]}
                role="switch"
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
          {prefsMsg?.ok && (
            <p className="flex items-center gap-1 text-xs text-accent"><CheckCircle2 size={12} />Preferencias guardadas</p>
          )}
          {prefsMsg?.error && (
            <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={12} />{prefsMsg.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, name, type = "text", defaultValue, placeholder, required, disabled,
}: {
  label: string; name: string; type?: string;
  defaultValue?: string; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-secondary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
