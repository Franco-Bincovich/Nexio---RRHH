"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-4 py-2 transition"
    >
      Cerrar sesión
    </button>
  );
}
