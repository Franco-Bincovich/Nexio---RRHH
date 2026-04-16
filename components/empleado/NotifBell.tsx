"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { marcarTodasLeidas, marcarLeida } from "@/app/dashboard/empleado/notificaciones/actions";
import { useRouter } from "next/navigation";

type Notif = {
  id: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  created_at: string;
};

const TIPO_LABEL: Record<string, string> = {
  ausencia:    "Inasistencia",
  retiro:      "Retiro anticipado",
  vacaciones:  "Vacaciones",
  objetivo:    "Objetivo",
  general:     "General",
};

export default function NotifBell({ notifs: initial }: { notifs: Notif[] }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const noLeidas = notifs.filter((n) => !n.leida).length;

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleMarcarTodas() {
    startTransition(async () => {
      await marcarTodasLeidas();
      setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
      router.refresh();
    });
  }

  function handleMarcarUna(id: string) {
    startTransition(async () => {
      await marcarLeida(id);
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-[#1A2235] flex items-center justify-center transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={16} className={noLeidas > 0 ? "text-accent" : "text-secondary"} />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-accent text-base text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-[#131920] border border-[#1A2235] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A2235]">
            <span className="text-sm font-semibold">Notificaciones</span>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button
                  onClick={handleMarcarTodas}
                  disabled={isPending}
                  className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                  Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-secondary hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={20} className="text-secondary/30 mx-auto mb-2" />
                <p className="text-xs text-secondary/60">Sin notificaciones</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#1A2235]">
                {notifs.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer ${!n.leida ? "bg-accent/[0.03]" : ""}`}
                    onClick={() => !n.leida && handleMarcarUna(n.id)}
                  >
                    {!n.leida && (
                      <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                    )}
                    {n.leida && <div className="w-1.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">{n.mensaje}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-secondary/50 bg-white/5 px-1.5 py-0.5 rounded">
                          {TIPO_LABEL[n.tipo] ?? n.tipo}
                        </span>
                        <span className="text-[10px] text-secondary/40">
                          {new Date(n.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
