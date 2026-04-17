"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { logAuditoria } from "@/lib/auditoria";

async function getRrhhCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, empresa_id, rol, es_demo")
    .eq("user_id", user.id)
    .single();
  if (!emp) return null;
  if (!emp.es_demo && emp.rol !== "rrhh") return null;
  return emp;
}

export async function crearEmpleado(data: {
  nombre: string;
  email: string;
  area_id: string | null;
  rol: string;
  modalidad: string;
  horas_laborables: number;
  password?: string;
}): Promise<{ error?: string }> {
  const ctx = await getRrhhCtx();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password?.trim() || "nexio1234",
    email_confirm: true,
    user_metadata: { nombre: data.nombre },
  });
  if (authError) return { error: authError.message };

  const { data: newEmp, error: insertError } = await admin.from("empleados").insert({
    user_id: authData.user.id,
    empresa_id: ctx.empresa_id,
    nombre: data.nombre,
    email: data.email,
    area_id: data.area_id,
    rol: data.rol as never,
    modalidad: data.modalidad as never,
    horas_laborables: data.horas_laborables,
  }).select("id").single();

  if (insertError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: insertError.message };
  }

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.id,
    accion: "crear_empleado",
    entidad: "empleados",
    entidad_id: newEmp?.id,
    detalle: { nombre: data.nombre, email: data.email, rol: data.rol },
  });

  revalidatePath("/dashboard/rrhh/empleados");
  return {};
}

export async function editarEmpleado(
  id: string,
  data: {
    area_id: string | null;
    rol: string;
    modalidad: string;
    horas_laborables: number;
    activo: boolean;
  }
): Promise<{ error?: string }> {
  const ctx = await getRrhhCtx();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("empleados")
    .update({
      area_id: data.area_id,
      rol: data.rol as never,
      modalidad: data.modalidad as never,
      horas_laborables: data.horas_laborables,
      activo: data.activo,
    })
    .eq("id", id)
    .eq("empresa_id", ctx.empresa_id);

  if (error) return { error: error.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.id,
    accion: "editar_empleado",
    entidad: "empleados",
    entidad_id: id,
    detalle: { rol: data.rol, modalidad: data.modalidad, activo: data.activo },
  });

  revalidatePath("/dashboard/rrhh/empleados");
  return {};
}

export async function toggleActivo(
  id: string,
  activo: boolean
): Promise<{ error?: string }> {
  const ctx = await getRrhhCtx();
  if (!ctx) return { error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("empleados")
    .update({ activo })
    .eq("id", id)
    .eq("empresa_id", ctx.empresa_id);

  if (error) return { error: error.message };

  await logAuditoria({
    empresa_id: ctx.empresa_id,
    empleado_id: ctx.id,
    accion: activo ? "activar_empleado" : "desactivar_empleado",
    entidad: "empleados",
    entidad_id: id,
  });

  revalidatePath("/dashboard/rrhh/empleados");
  return {};
}
