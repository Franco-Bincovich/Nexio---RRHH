"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarEntradaHomeLider, registrarSalidaHomeLider } from "@/app/dashboard/lider/mi-asistencia/actions";
import { Home, Loader2, CheckCircle2, AlertCircle, LogOut } from "lucide-react";

interface Props {
  empleadoId:   string;
  entradaHoyId: string | null;
}

export default function RegistrarHomeLiderButton({ empleadoId, entradaHoyId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [entradaOk, setEntradaOk]   = useState(false);
  const [salidaOk,  setSalidaOk]    = useState(false);
  const [errorMsg,  setErrorMsg]     = useState("");

  function handleEntrada() {
    setErrorMsg("");
    startTransition(async () => {
      const res = await registrarEntradaHomeLider(empleadoId);
      if (res.error) setErrorMsg(res.error);
      else { setEntradaOk(true); router.refresh(); }
    });
  }

  function handleSalida() {
    if (!entradaHoyId) return;
    setErrorMsg("");
    startTransition(async () => {
      const res = await registrarSalidaHomeLider(entradaHoyId);
      if (res.error) setErrorMsg(res.error);
      else { setSalidaOk(true); router.refresh(); }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {errorMsg && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
          <AlertCircle size={15} />{errorMsg}
        </div>
      )}

      {/* Botón Entrada — solo si no hay entrada hoy */}
      {!entradaHoyId && (
        entradaOk ? (
          <div className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5">
            <CheckCircle2 size={15} />Entrada registrada
          </div>
        ) : (
          <button
            onClick={handleEntrada}
            disabled={isPending}
            className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Home size={15} />}
            Registrar entrada HOME
          </button>
        )
      )}

      {/* Botón Salida — solo si hay entrada sin salida hoy */}
      {entradaHoyId && (
        salidaOk ? (
          <div className="flex items-center gap-2 text-orange-400 text-sm bg-orange-400/10 border border-orange-400/20 rounded-xl px-4 py-2.5">
            <CheckCircle2 size={15} />Salida registrada
          </div>
        ) : (
          <button
            onClick={handleSalida}
            disabled={isPending}
            className="flex items-center gap-2 bg-orange-400/10 hover:bg-orange-400/20 text-orange-400 border border-orange-400/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            Registrar salida HOME
          </button>
        )
      )}
    </div>
  );
}
