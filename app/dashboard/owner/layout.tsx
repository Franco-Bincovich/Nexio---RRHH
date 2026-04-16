import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import Sidebar from "@/components/owner/Sidebar";
import { MOCK_EMPRESAS } from "@/lib/owner-mock";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: owner } = await supabase
    .from("owners")
    .select("id, nombre, email, holding_nombre")
    .eq("user_id", user.id)
    .single();

  if (!owner) redirect("/login");

  const admin = createAdminClient();

  const { data: ownerEmpresas } = await admin
    .from("owner_empresas")
    .select("empresa_id")
    .eq("owner_id", owner.id);

  const empresaIds = (ownerEmpresas ?? []).map((oe) => oe.empresa_id);

  const { data: empresasReal } = await admin
    .from("empresas")
    .select("id, nombre")
    .in("id", empresaIds.length > 0 ? empresaIds : [""])
    .order("nombre");

  const empresas = (empresasReal && empresasReal.length > 0)
    ? empresasReal
    : MOCK_EMPRESAS.map((e) => ({ id: e.id, nombre: e.nombre }));

  return (
    <div className="min-h-screen bg-base text-foreground">
      <Sidebar
        ownerNombre={owner.nombre}
        ownerEmail={owner.email}
        holdingNombre={owner.holding_nombre ?? "Mi holding"}
        empresas={empresas ?? []}
      />
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
