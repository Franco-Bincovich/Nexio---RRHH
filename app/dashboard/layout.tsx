import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getDemoRol, resolveRol } from "@/lib/demo-rol";
import DemoRolSelector from "@/components/DemoRolSelector";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("rol, es_demo")
    .eq("user_id", user.id)
    .maybeSingle();

  const esDemo = empleado?.es_demo === true;
  const demoRol = await getDemoRol();
  const rolActivo = esDemo ? resolveRol(empleado, demoRol) : null;

  return (
    <>
      {children}
      <DemoRolSelector esDemo={esDemo} rolActivo={rolActivo} />
    </>
  );
}
