"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Target,
  BookOpen,
  MessageSquare,
  LogOut,
  Menu,
  X,
  UsersRound,
  ClipboardList,
  ClipboardCheck,
  UserX,
  DoorOpen,
  Umbrella,
  Clock,
  Fingerprint,
  Sparkles,
  UserCircle,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  href:   string;
  label:  string;
  icon:   React.ElementType;
  badge?: number;
}

interface NavGroup {
  label:  string;
  items:  NavItem[];
}

interface SidebarProps {
  nombre:             string;
  email:              string;
  areaNombre:         string | null;
  pendingSolicitudes: number;
}

export default function Sidebar({ nombre, email, areaNombre, pendingSolicitudes }: SidebarProps) {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [grupo1Open,   setGrupo1Open]   = useState(true);
  const [grupo2Open,   setGrupo2Open]   = useState(true);
  const pathname = usePathname();
  const router   = useRouter();

  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const grupos: NavGroup[] = [
    {
      label: "Mis acciones",
      items: [
        { href: "/dashboard/lider/perfil",         label: "Mi perfil",            icon: UserCircle },
        { href: "/dashboard/lider/mi-asistencia",  label: "Mi asistencia",        icon: Fingerprint },
        { href: "/dashboard/lider/mi-banco-horas", label: "Mi banco de horas",    icon: Clock },
        { href: "/dashboard/lider/mis-ausencias",  label: "Mis inasistencias",    icon: UserX },
        { href: "/dashboard/lider/mis-retiros",    label: "Mis retiros anticipados", icon: DoorOpen },
        { href: "/dashboard/lider/mis-vacaciones", label: "Mis vacaciones",       icon: Umbrella },
      ],
    },
    {
      label: "Acciones equipo",
      items: [
        { href: "/dashboard/lider/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
        { href: "/dashboard/lider/equipo",         label: "Mi equipo",      icon: Users },
        { href: "/dashboard/lider/asistencia",     label: "Asistencia",     icon: CalendarClock },
        { href: "/dashboard/lider/solicitudes",    label: "Solicitudes",    icon: ClipboardList, badge: pendingSolicitudes || undefined },
        { href: "/dashboard/lider/objetivos",      label: "Objetivos",      icon: Target },
        { href: "/dashboard/lider/foro",           label: "Comunicaciones", icon: MessageSquare },
        { href: "/dashboard/lider/grupos",         label: "Grupos",         icon: UsersRound },
        { href: "/dashboard/lider/evaluaciones",   label: "Evaluaciones",   icon: ClipboardCheck },
        { href: "/dashboard/lider/capacitaciones", label: "Capacitaciones", icon: BookOpen },
        { href: "/dashboard/lider/ai",             label: "Nexio AI",       icon: Sparkles },
      ],
    },
  ];

  const groupStates = [
    { open: grupo1Open, setOpen: setGrupo1Open },
    { open: grupo2Open, setOpen: setGrupo2Open },
  ];

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
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-secondary hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav con grupos */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        {grupos.map((grupo, gi) => {
          const { open, setOpen } = groupStates[gi];
          return (
            <div key={grupo.label}>
              {/* Cabecera del grupo */}
              <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-border/20 transition-colors group"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.7px] text-secondary/50 group-hover:text-secondary/70 transition-colors">
                  {grupo.label}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-secondary/40 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
                />
              </button>

              {/* Items del grupo */}
              {open && (
                <div className="mt-0.5 space-y-0.5">
                  {grupo.items.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 py-2.5 rounded-lg text-sm transition-colors ${
                          active
                            ? "bg-accent/10 text-accent font-medium border-l-2 border-accent pl-[10px] pr-3"
                            : "text-secondary hover:text-foreground hover:bg-accent/[0.05] px-3"
                        }`}
                      >
                        <item.icon size={17} strokeWidth={active ? 2.5 : 2} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span className="text-[10px] font-bold bg-yellow-400 text-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Separador entre grupos */}
              {gi < grupos.length - 1 && (
                <div className="border-b border-border my-2" />
              )}
            </div>
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
      {/* Desktop: sidebar fijo */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="fixed top-0 left-0 h-screen w-64">
          {sidebarBody}
        </div>
      </div>

      {/* Mobile: top bar */}
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
        <div className="ml-auto flex items-center gap-2">
          {pendingSolicitudes > 0 && (
            <span className="text-[10px] font-bold bg-yellow-400 text-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
              {pendingSolicitudes > 99 ? "99+" : pendingSolicitudes}
            </span>
          )}
          <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-semibold text-accent">
            {initials}
          </div>
        </div>
      </div>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: drawer */}
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
