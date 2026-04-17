"use client";

import { useTransition } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";

type Notif = {
  id: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  created_at: string;
};

type Props = {
  notifs: Notif[];
  onMarcarLeida: (id: string) => Promise<{ ok?: boolean; error?: string }>;
  onMarcarTodas: () => Promise<{ ok?: boolean; error?: string }>;
};

function formatRelativa(fecha: string) {
  const d = new Date(fecha);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function NotificacionesHistorial({ notifs, onMarcarLeida, onMarcarTodas }: Props) {
  const [pending, startTransition] = useTransition();
  const sinLeer = notifs.filter((n) => !n.leida).length;

  return (
    <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
        <Bell size={15} className="text-accent" />
        <h2 className="text-sm font-semibold">Historial</h2>
        <span className="text-xs text-secondary">
          {sinLeer > 0 ? `${sinLeer} sin leer` : "Todas leídas"}
        </span>
        {sinLeer > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => { onMarcarTodas(); })}
            className="ml-auto text-xs text-accent hover:text-accent/80 transition flex items-center gap-1 disabled:opacity-50"
          >
            <CheckCheck size={12} />
            Marcar todas
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-secondary/60">No tenés notificaciones.</p>
        </div>
      ) : (
        <ul className="max-h-96 overflow-y-auto">
          {notifs.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-5 py-3 border-b border-[#1A2235] last:border-0 ${
                !n.leida ? "bg-accent/5" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{n.mensaje}</p>
                <p className="text-[10px] text-secondary/60 mt-1 uppercase tracking-wide">
                  {n.tipo} · {formatRelativa(n.created_at)}
                </p>
              </div>
              {!n.leida && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => { onMarcarLeida(n.id); })}
                  className="text-xs text-accent hover:text-accent/80 transition flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                  title="Marcar como leída"
                >
                  <Check size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
