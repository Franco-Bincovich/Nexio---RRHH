"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Network,
  Target,
  BarChart3,
  MessageSquare,
  Sparkles,
  LogOut,
  Menu,
  X,
  UserCircle,
  Fingerprint,
  Clock,
  UserX,
  DoorOpen,
  Umbrella,
  ClipboardList,
  Thermometer,
  ClipboardCheck,
  Wallet,
  GitBranch,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ElementType;
  badge?: number;
  beta?:  boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  nombre:        string;
  email:         string;
  empresaNombre: string | null;
  pendingSolicitudes?: number;
}

export default function Sidebar({ nombre, email, empresaNombre, pendingSolicitudes = 0 }: SidebarProps) {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [grupo1Open,  setGrupo1Open]  = useState(true);
  const [grupo2Open,  setGrupo2Open]  = useState(true);
  const pathname = usePathname();
  const router   = useRouter();

  const initials = nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const grupos: NavGroup[] = [
    {
      label: "Mis acciones",
      items: [
        { href: "/dashboard/gerente/perfil",          label: "Mi perfil",              icon: UserCircle },
        { href: "/dashboard/gerente/mi-asistencia",   label: "Mi asistencia",          icon: Fingerprint },
        { href: "/dashboard/gerente/mi-banco-horas",  label: "Mi banco de horas",      icon: Clock },
        { href: "/dashboard/gerente/mis-ausencias",   label: "Mis inasistencias",      icon: UserX },
        { href: "/dashboard/gerente/mis-retiros",     label: "Mis retiros anticipados",icon: DoorOpen },
        { href: "/dashboard/gerente/mis-vacaciones",  label: "Mis vacaciones",         icon: Umbrella },
      ],
    },
    {
      label: "Gestión empresa",
      items: [
        { href: "/dashboard/gerente/dashboard",   label: "Dashboard",    icon: LayoutDashboard },
        { href: "/dashboard/gerente/areas",       label: "Áreas",        icon: Building2 },
        { href: "/dashboard/gerente/empleados",   label: "Empleados",    icon: Users },
        { href: "/dashboard/gerente/organigrama", label: "Organigrama",  icon: Network },
        { href: "/dashboard/gerente/objetivos",    label: "Objetivos",    icon: Target },
        { href: "/dashboard/gerente/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
        { href: "/dashboard/gerente/sucesion",     label: "Sucesión",     icon: GitBranch },
        { href: "/dashboard/gerente/costos",       label: "Costos",       icon: Wallet },
        { href: "/dashboard/gerente/reportes",     label: "Reportes",     icon: BarChart3 },
        { href: "/dashboard/gerente/temperatura", label: "Temperatura",  icon: Thermometer },
        { href: "/dashboard/gerente/solicitudes", label: "Solicitudes",  icon: ClipboardList, badge: pendingSolicitudes },
        { href: "/dashboard/gerente/vacaciones",  label: "Vacaciones",   icon: Umbrella },
        { href: "/dashboard/gerente/foros",       label: "Foros",        icon: MessageSquare },
        { href: "/dashboard/gerente/ai",          label: "Nexio AI",     icon: Sparkles, beta: true },
      ],
    },
  ];

  const groupOpen    = [grupo1Open,  grupo2Open];
  const setGroupOpen = [setGrupo1Open, setGrupo2Open];

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
          {empresaNombre && (
            <p className="text-xs text-secondary mt-0.5 truncate max-w-[160px]">{empresaNombre}</p>
          )}
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-secondary hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {grupos.map((grupo, gi) => (
          <div key={grupo.label} className="mb-1">
            {/* Group header */}
            <button
              onClick={() => setGroupOpen[gi](!groupOpen[gi])}
              className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 text-[10px] uppercase tracking-[0.7px] text-secondary/50 hover:text-secondary/80 transition-colors"
            >
              {grupo.label}
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${groupOpen[gi] ? "" : "-rotate-90"}`}
              />
            </button>

            {/* Items */}
            {groupOpen[gi] && (
              <div className="space-y-0.5">
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
                      <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="ml-auto text-[9px] bg-yellow-400 text-black font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                      {item.beta && (
                        <span className="ml-auto text-[9px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5 font-semibold tracking-wide flex-shrink-0">
                          BETA
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
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
            <span className="text-[9px] bg-yellow-400 text-black font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {pendingSolicitudes}
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
