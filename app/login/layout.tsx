import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

// Este layout corre DESPUÉS de que el proxy ya seteó las cookies de sesión
// en supabaseResponse. Por eso getUser() funciona correctamente acá.
export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[LoginLayout] user:", user?.id ?? "ninguno");

  if (user) {
    // Primero verificar si es owner (tabla separada de empleados)
    const { data: owner } = await supabase
      .from("owners")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (owner) redirect("/dashboard/owner");

    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("rol")
      .eq("user_id", user.id)
      .single();

    console.log("[LoginLayout] empleado.rol:", empleado?.rol ?? null, "error:", empleadoError?.message ?? null);

    // Si tiene sesión y registro en empleados → ir a su dashboard
    if (empleado?.rol) {
      console.log("[LoginLayout] → redirect /dashboard/" + empleado.rol);
      redirect(`/dashboard/${empleado.rol}`);
    }

    // Tiene sesión pero no está en ninguna tabla → dejar renderizar /login
  }

  return <>{children}</>;
}
