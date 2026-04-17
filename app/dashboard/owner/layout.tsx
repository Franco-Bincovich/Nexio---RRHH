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

  const admin = createAdminClient();

  // Chequeo demo con admin client (bypass RLS) para poder autorizar
  // a usuarios que sólo existen en `empleados` (no en `owners`).
  const { data: demoEmp } = await admin
    .from("empleados")
    .select("id, nombre, email, empresa_id, es_demo")
    .eq("user_id", user.id)
    .maybeSingle();

  const esDemo = demoEmp?.es_demo === true;

  let ownerInfo: { id: string; nombre: string; email: string; holding_nombre: string | null };
  let empresaIds: string[];

  if (esDemo && demoEmp) {
    // Usuario demo: acceso al panel owner sin validar contra `owners` por user_id.
    // Si existe un owner real con el mismo email, usamos su información y
    // sus empresas asociadas (caso Franco: empleado + owner con mismo email).
    const { data: ownerByEmail } = await admin
      .from("owners")
      .select("id, nombre, email, holding_nombre")
      .eq("email", demoEmp.email)
      .maybeSingle();

    if (ownerByEmail) {
      ownerInfo = ownerByEmail;
      const { data: ownerEmpresas } = await admin
        .from("owner_empresas")
        .select("empresa_id")
        .eq("owner_id", ownerByEmail.id);
      empresaIds = (ownerEmpresas ?? []).map((oe) => oe.empresa_id);
      // Fallback extra: si el owner real no tiene empresas, al menos mostrar la del empleado.
      if (empresaIds.length === 0) empresaIds = [demoEmp.empresa_id];
    } else {
      // Fallback: owner ficticio con sólo la empresa del empleado.
      ownerInfo = {
        id: demoEmp.id,
        nombre: demoEmp.nombre,
        email: demoEmp.email,
        holding_nombre: "Demo",
      };
      empresaIds = [demoEmp.empresa_id];
    }
  } else {
    // Flujo normal: validar contra tabla `owners`.
    const { data: owner } = await supabase
      .from("owners")
      .select("id, nombre, email, holding_nombre")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!owner) redirect("/login");

    ownerInfo = owner;
    const { data: ownerEmpresas } = await admin
      .from("owner_empresas")
      .select("empresa_id")
      .eq("owner_id", owner.id);
    empresaIds = (ownerEmpresas ?? []).map((oe) => oe.empresa_id);
  }

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
        ownerNombre={ownerInfo.nombre}
        ownerEmail={ownerInfo.email}
        holdingNombre={ownerInfo.holding_nombre ?? "Mi holding"}
        empresas={empresas ?? []}
      />
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
