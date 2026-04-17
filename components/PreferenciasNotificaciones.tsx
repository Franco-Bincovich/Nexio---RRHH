"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import type { PrefKey } from "@/lib/notif-prefs";
import { PREF_LABELS } from "@/lib/notif-prefs";

type Props = {
  initialPrefs: Record<PrefKey, boolean>;
  onSave: (prefs: Record<string, boolean>) => Promise<{ ok?: boolean; error?: string }>;
};

const ORDER: PrefKey[] = [
  "ausencias",
  "solicitudes",
  "objetivos",
  "capacitaciones",
  "temperatura",
  "foros",
  "resumen_semanal",
];

export default function PreferenciasNotificaciones({ initialPrefs, onSave }: Props) {
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(initialPrefs);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(key: PrefKey) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setFeedback(null);
    startTransition(async () => {
      const res = await onSave(next);
      if (res.error) {
        setPrefs(prefs);
        setFeedback(res.error);
      } else {
        setFeedback("Guardado");
        setTimeout(() => setFeedback((f) => (f === "Guardado" ? null : f)), 1500);
      }
    });
  }

  return (
    <div className="bg-surface rounded-xl border border-[#1A2235] shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1A2235]">
        <Bell size={15} className="text-accent" />
        <h2 className="text-sm font-semibold">Preferencias de notificaciones</h2>
        {feedback && (
          <span className={`ml-auto text-xs ${feedback === "Guardado" ? "text-accent" : "text-red-400"}`}>
            {feedback}
          </span>
        )}
      </div>

      <ul>
        {ORDER.map((key) => (
          <li
            key={key}
            className="flex items-center justify-between px-5 py-3.5 border-b border-[#1A2235] last:border-0"
          >
            <span className="text-sm">{PREF_LABELS[key]}</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => toggle(key)}
              disabled={pending}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                prefs[key] ? "bg-accent" : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform translate-y-0.5 ${
                  prefs[key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
