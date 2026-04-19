import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Building2, Monitor, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import PerfilGerenteClient from "./PerfilGerenteClient";

export default async function PerfilGerentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gerente } = await supabase
    .from("empleados")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!gerente) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-1">Mi perfil</h1>
        <div className="mt-8 flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0" />
          <p className="text-sm">No se pudo cargar tu perfil.</p>
        </div>
      </div>
    );
  }

  const { data: empresa } = await supabase.from("empresas").select("nombre").eq("id", gerente.empresa_id).single();
  const { data: docsData } = await supabase.storage.from("empleado-docs").list(user.id, { sortBy: { column: "created_at", order: "desc" } });

  const fechaIngreso = new Date(gerente.created_at).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Mi perfil</h1>
      <p className="text-secondary text-sm mb-6">Tu información en Nexio</p>

      <div className="bg-surface rounded-xl border border-border shadow-sm divide-y divide-border mb-6">
        <div className="flex items-center gap-4 px-5 py-3.5">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent">
            <CheckCircle2 size={11} />Gerente General
          </span>
        </div>
        <DataRow icon={Building2} label="Empresa"          value={empresa?.nombre ?? "—"} />
        <DataRow icon={Monitor}   label="Modalidad"        value={gerente.modalidad ?? "—"} />
        <DataRow icon={Calendar}  label="Fecha de ingreso" value={fechaIngreso} />
      </div>

      <PerfilGerenteClient
        empleado={{
          id: gerente.id, nombre: gerente.nombre, email: gerente.email,
          telefono: gerente.telefono ?? null, direccion: gerente.direccion ?? null,
          contacto_emergencia_nombre: gerente.contacto_emergencia_nombre ?? null,
          contacto_emergencia_telefono: gerente.contacto_emergencia_telefono ?? null,
          avatar_url: gerente.avatar_url ?? null,
        }}
        userId={user.id}
        documentos={docsData ?? []}
        notifPrefs={{
          inasistencias:  gerente.notif_preferencias?.inasistencias  ?? true,
          objetivos:      gerente.notif_preferencias?.objetivos       ?? true,
          vacaciones:     gerente.notif_preferencias?.vacaciones      ?? true,
          capacitaciones: gerente.notif_preferencias?.capacitaciones  ?? true,
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
