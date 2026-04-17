"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, isDemoRol, type DemoRol } from "./demo-rol";

export async function setDemoRol(rol: DemoRol) {
  if (!isDemoRol(rol)) return;
  const store = await cookies();
  store.set(DEMO_COOKIE, rol, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/dashboard/${rol}`);
}
