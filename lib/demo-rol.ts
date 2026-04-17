import { cookies } from "next/headers";
import type { RolSistema } from "@/types/database";

export const DEMO_COOKIE = "nexio-demo-rol";

export type DemoRol = RolSistema | "owner";

const VALID_ROLES: readonly DemoRol[] = [
  "empleado",
  "lider",
  "gerente",
  "rrhh",
  "owner",
] as const;

export function isDemoRol(value: unknown): value is DemoRol {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}

export async function getDemoRol(): Promise<DemoRol | null> {
  const store = await cookies();
  const value = store.get(DEMO_COOKIE)?.value;
  return isDemoRol(value) ? value : null;
}

export function resolveRol(
  empleado: { rol: RolSistema; es_demo?: boolean | null } | null | undefined,
  demoRol: DemoRol | null,
): DemoRol | null {
  if (!empleado) return null;
  if (empleado.es_demo && demoRol) return demoRol;
  return empleado.rol;
}
