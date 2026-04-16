import { redirect } from "next/navigation";

export default async function EmpleadoIndex() {
  console.log("[EmpleadoIndex] → redirect /dashboard/empleado/perfil");
  redirect("/dashboard/empleado/perfil");
}
