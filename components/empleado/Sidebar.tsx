"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  CalendarClock,
  Target,
  BookOpen,
  Heart,
  MessageSquare,
  LogOut,
  Menu,
  X,
  UserX,
  DoorOpen,
  Umbrella,
  Clock4,
  BarChart2,
} from "lucide-react";

import { createClient } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { href: "/dashboard/empleado/perfil",         label: "Mi perfil",              icon: User },
  { href: "/dashboard/empleado/asistencia",     label: "Mi asistencia",          icon: CalendarClock },
  { href: "/dashboard/empleado/banco-horas",    label: "Banco de horas",         icon: Clock4 },
  { href: "/dashboard/empleado/ausencias",      label: "Inasistencias",          icon: UserX },
  { href: "/dashboard/empleado/retiros",        label: "Retiros anticipados",    icon: DoorOpen },
  { href: "/dashboard/empleado/vacaciones",     label: "Vacaciones",             icon: Umbrella },
  { href: "/dashboard/empleado/objetivos",      label: "Mis objetivos",          icon: Target },
  { href: "/dashboard/empleado/evaluaciones",   label: "Evaluaciones",           icon: BarChart2 },
  { href: "/dashboard/empleado/capacitaciones", label: "Capacitaciones",         icon: BookOpen },
  { href: "/dashboard/empleado/temperatura",    label: "Temperatura del equipo", icon: Heart },
  { href: "/dashboard/empleado/foro",           label: "Foros",                  icon: MessageSquare },
];

interface SidebarProps {
  nombre: string;
  email: string;
  areaNombre: string | null;
}

export default function Sidebar({ nombre, email, areaNombre }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebarBody = (
    <div className="w-64 bg-sidebar border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
              <path d="M 10 28 A 18 18 0 0 1 46 28" stroke="#3ECFB2" strokeWidth="3.2" strokeLinecap="round"/>
              <path d="M 16 36 A 12 12 0 0 0 40 20" stroke="#3ECFB2" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
              <path d="M 20 28 A 8 8 0 0 1 36 28" stroke="#3ECFB2" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
              <circle cx="28" cy="28" r="4" fill="#3ECFB2"/>
              <circle cx="10" cy="28" r="2.8" fill="#3ECFB2" opacity="0.5"/>
              <circle cx="46" cy="28" r="2.8" fill="#3ECFB2"/>
            </svg>
            <span className="text-xl font-bold text-accent tracking-tight">Nexio</span>
          </div>
          {areaNombre && (
            <p className="text-xs text-secondary mt-0.5 truncate max-w-[160px]">{areaNombre}</p>
          )}
        </div>
        {/* Cerrar drawer — solo mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-secondary hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-secondary hover:text-foreground hover:bg-accent/[0.05]"
              }`}
            >
              <item.icon size={17} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{nombre}</p>
            <p className="text-xs text-secondary truncate">{email}</p>
          </div>
        </div>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-secondary hover:text-foreground transition-colors w-full"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop: sidebar fijo ─────────────────────────────── */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="fixed top-0 left-0 h-screen w-64">
          {sidebarBody}
        </div>
      </div>

      {/* ── Mobile: top bar ──────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-sidebar border-b border-border flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-secondary hover:text-foreground transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 56 56" fill="none">
            <path d="M 10 28 A 18 18 0 0 1 46 28" stroke="#3ECFB2" strokeWidth="3.2" strokeLinecap="round"/>
            <path d="M 16 36 A 12 12 0 0 0 40 20" stroke="#3ECFB2" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
            <path d="M 20 28 A 8 8 0 0 1 36 28" stroke="#3ECFB2" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
            <circle cx="28" cy="28" r="4" fill="#3ECFB2"/>
            <circle cx="10" cy="28" r="2.8" fill="#3ECFB2" opacity="0.5"/>
            <circle cx="46" cy="28" r="2.8" fill="#3ECFB2"/>
          </svg>
          <span className="text-lg font-bold text-accent tracking-tight">Nexio</span>
        </div>
        <div className="ml-auto w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-semibold text-accent">
          {initials}
        </div>
      </div>

      {/* ── Mobile: backdrop ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: drawer ───────────────────────────────────── */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-screen z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarBody}
      </div>
    </>
  );
}
