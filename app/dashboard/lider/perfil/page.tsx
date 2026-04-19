import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Building2, Briefcase, Monitor, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import PerfilLiderClient from "./PerfilLiderClient";

const MODALIDAD_LABEL: Record<string, string> = {
  presencial: "Presencial",
  remoto:     "Remoto",
  hibrido:    "Híbrido",
};

const ROL_LABEL: Record<string, string> = {
  empleado: "Empleado",
  lider:    "Líder de equipo",
  gerente:  "Gerente",
  rrhh:     "Recursos Humanos",
};

export default async function PerfilLiderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lider } = await supabase
    .from("empleados")
    .select("*, areas!empleados_area_id_fkey(nombre)")
    .eq("user_id", user.id)
    .single();

  if (!lider) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Mi perfil</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0" />
          <p className="text-sm">No se pudo cargar tu perfil. Intentá recargar la página.</p>
        </div>
      </div>
    );
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre")
    .eq("id", lider.empresa_id)
    .single();

  const { data: docsData } = await supabase.storage
    .from("empleado-docs")
    .list(user.id, { sortBy: { column: "created_at", order: "desc" } });

  const areaNombre    = (lider.areas as { nombre: string } | null)?.nombre ?? "Sin área asignada";
  const empresaNombre = empresa?.nombre ?? "—";
  const fechaIngreso  = new Date(lider.created_at).toLocaleDateString("es-AR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Mi perfil</h1>
      <p className="text-secondary text-sm mb-6">Tu información en Nexio</p>

      {/* Datos de solo lectura */}
      <div className="bg-surface rounded-xl border border-border shadow-sm divide-y divide-border mb-6">
        <div className="flex items-center gap-4 px-5 py-3.5">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${lider.activo ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-400"}`}>
            <CheckCircle2 size={11} />
            {lider.activo ? "Activo" : "Inactivo"}
          </span>
          <span className="text-xs text-secondary">{ROL_LABEL[lider.rol] ?? lider.rol}</span>
        </div>
        <DataRow icon={Building2} label="Empresa"          value={empresaNombre} />
        <DataRow icon={Briefcase} label="Área"             value={areaNombre} />
        <DataRow icon={Monitor}   label="Modalidad"        value={MODALIDAD_LABEL[lider.modalidad] ?? lider.modalidad} />
        <DataRow icon={Calendar}  label="Fecha de ingreso" value={fechaIngreso} />
      </div>

      <PerfilLiderClient
        empleado={{
          id:                           lider.id,
          nombre:                       lider.nombre,
          email:                        lider.email,
          telefono:                     lider.telefono ?? null,
          direccion:                    lider.direccion ?? null,
          contacto_emergencia_nombre:   lider.contacto_emergencia_nombre ?? null,
          contacto_emergencia_telefono: lider.contacto_emergencia_telefono ?? null,
          avatar_url:                   lider.avatar_url ?? null,
        }}
        userId={user.id}
        documentos={docsData ?? []}
        notifPrefs={{
          inasistencias:  lider.notif_preferencias?.inasistencias  ?? true,
          objetivos:      lider.notif_preferencias?.objetivos       ?? true,
          vacaciones:     lider.notif_preferencias?.vacaciones      ?? true,
          capacitaciones: lider.notif_preferencias?.capacitaciones  ?? true,
        }}
      />
    </div>
  );
}

function DataRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-secondary" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.6px] text-secondary/60 mb-0.5">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
