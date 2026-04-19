"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // 1. Iniciar sesión
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    // 2. Buscar en empleados
    const { data: empleado } = await supabase
      .from("empleados")
      .select("rol")
      .eq("user_id", authData.user.id)
      .single();

    if (empleado?.rol) {
      router.push(`/dashboard/${empleado.rol}`);
      router.refresh();
      return;
    }

    // 3. Si no es empleado, buscar en owners
    const { data: owner } = await supabase
      .from("owners")
      .select("id")
      .eq("user_id", authData.user.id)
      .single();

    if (owner) {
      router.push("/dashboard/owner");
      router.refresh();
      return;
    }

    // 4. No existe en ninguna tabla
    setError("Tu usuario no está asociado a ninguna empresa en Nexio.");
    await supabase.auth.signOut();
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / marca */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-accent">Nexio</span>
          </h1>
          <p className="mt-2 text-secondary text-sm">
            Gestión de capital humano
          </p>
        </div>

        {/* Tarjeta */}
        <div className="bg-surface rounded-2xl p-8 border border-white/5 shadow-xl">
          <h2 className="text-xl font-semibold mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-gray-600 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
                placeholder="tu@empresa.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm text-secondary"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-gray-600 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold rounded-lg py-2.5 text-sm transition"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
