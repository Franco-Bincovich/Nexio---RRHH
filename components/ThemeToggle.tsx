"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  // Evita hydration mismatch: el tema real solo se conoce en cliente tras leer
  // localStorage. En el primer render (SSR + primer client render) mostramos un
  // placeholder del mismo tamaño para no generar layout shift ni divergencia.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex items-center gap-2 text-xs text-secondary w-full"
        aria-hidden
        disabled
      >
        <span className="inline-block w-[14px] h-[14px]" />
        <span className="opacity-0">Modo oscuro</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 text-xs text-secondary hover:text-foreground transition-colors w-full"
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
