"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { registrarSalidaHome } from "@/app/dashboard/empleado/asistencia/actions";
import { Home, Loader2, CheckCircle2, AlertCircle, LogOut } from "lucide-react";

interface Props {
  empleadoId: string;
  /** ID del registro de entrada de hoy sin salida, si existe */
  entradaHoyId: string | null;
}

export default function RegistrarHomeButton({ empleadoId, entradaHoyId }: Props) {
  const [statusEntrada, setStatusEntrada] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [statusSalida,  setStatusSalida]  = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleEntrada() {
    setStatusEntrada("loading");
    const supabase = createClient();
    const hoy = new Date().toISOString().split("T")[0];
    const hora = new Date().toTimeString().slice(0, 8);

    const { error } = await supabase.from("registros_asistencia").insert({
      empleado_id: empleadoId,
      tipo: "entrada",
      metodo: "home",
      fecha: hoy,
      hora_entrada: hora,
    });

    if (error) { setStatusEntrada("error"); setErrorMsg(error.message); }
    else { setStatusEntrada("ok"); router.refresh(); }
  }

  async function handleSalida() {
    if (!entradaHoyId) return;
    setStatusSalida("loading");
    const res = await registrarSalidaHome(entradaHoyId);
    if (res.error) { setStatusSalida("error"); setErrorMsg(res.error); }
    else { setStatusSalida("ok"); router.refresh(); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Botón Entrada */}
      {statusEntrada === "ok" ? (
        <div className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5">
          <CheckCircle2 size={15} />
          Entrada registrada
        </div>
      ) : statusEntrada === "error" ? (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
          <AlertCircle size={15} />
          {errorMsg || "Error al registrar"}
        </div>
      ) : (
        !entradaHoyId && (
          <button
            onClick={handleEntrada}
            disabled={statusEntrada === "loading"}
            className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {statusEntrada === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Home size={15} />}
            Registrar HOME
          </button>
        )
      )}

      {/* Botón Salida — solo si hay entrada hoy sin salida */}
      {entradaHoyId && (
        statusSalida === "ok" ? (
          <div className="flex items-center gap-2 text-orange-400 text-sm bg-orange-400/10 border border-orange-400/20 rounded-xl px-4 py-2.5">
            <CheckCircle2 size={15} />
            Salida registrada
          </div>
        ) : (
          <button
            onClick={handleSalida}
            disabled={statusSalida === "loading"}
            className="flex items-center gap-2 bg-orange-400/10 hover:bg-orange-400/20 text-orange-400 border border-orange-400/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {statusSalida === "loading" ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            Registrar salida HOME
          </button>
        )
      )}
    </div>
  );
}
