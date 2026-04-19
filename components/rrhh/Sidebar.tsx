"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Thermometer,
  ClipboardList,
  BookOpen,
  MessageSquare,
  Inbox,
  Settings,
  History,
  LogOut,
  Menu,
  X,
  UserCircle,
  Fingerprint,
  Clock,
  UserX,
  DoorOpen,
  Umbrella,
  UserPlus,
  UserMinus,
  Megaphone,
  GitBranch,
  Wallet,
  LineChart,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const grupos: NavGroup[] = [
  {
    label: "Mis acciones",
    items: [
      { href: "/dashboard/rrhh/perfil",          label: "Mi perfil",               icon: UserCircle  },
      { href: "/dashboard/rrhh/mi-asistencia",   label: "Mi asistencia",           icon: Fingerprint },
      { href: "/dashboard/rrhh/mi-banco-horas",  label: "Mi banco de horas",       icon: Clock       },
      { href: "/dashboard/rrhh/mis-ausencias",   label: "Mis inasistencias",       icon: UserX       },
      { href: "/dashboard/rrhh/mis-retiros",     label: "Mis retiros anticipados", icon: DoorOpen    },
      { href: "/dashboard/rrhh/mis-vacaciones",  label: "Mis vacaciones",          icon: Umbrella    },
    ],
  },
  {
    label: "Personas",
    items: [
      { href: "/dashboard/rrhh/empleados",    label: "Empleados",    icon: Users      },
      { href: "/dashboard/rrhh/onboarding",   label: "Onboarding",   icon: UserPlus   },
      { href: "/dashboard/rrhh/offboarding",  label: "Offboarding",  icon: UserMinus  },
      { href: "/dashboard/rrhh/sucesion",     label: "Sucesión",     icon: GitBranch  },
      { href: "/dashboard/rrhh/areas",        label: "Áreas",        icon: Building2  },
    ],
  },
  {
    label: "Solicitudes",
    items: [
      { href: "/dashboard/rrhh/solicitudes",  label: "Solicitudes",  icon: Inbox         },
      { href: "/dashboard/rrhh/vacaciones",   label: "Vacaciones",   icon: Umbrella      },
      { href: "/dashboard/rrhh/asistencia",   label: "Asistencia",   icon: CalendarClock },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/dashboard/rrhh/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
      { href: "/dashboard/rrhh/evaluaciones",   label: "Evaluaciones",   icon: ClipboardList   },
      { href: "/dashboard/rrhh/temperatura",    label: "Temperatura",    icon: Thermometer     },
      { href: "/dashboard/rrhh/capacitaciones", label: "Capacitaciones", icon: BookOpen        },
      { href: "/dashboard/rrhh/costos",         label: "Costos",         icon: Wallet          },
      { href: "/dashboard/rrhh/enps",           label: "eNPS",           icon: LineChart       },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/dashboard/rrhh/configuracion",  label: "Configuración",  icon: Settings      },
      { href: "/dashboard/rrhh/auditoria",      label: "Auditoría",      icon: History       },
      { href: "/dashboard/rrhh/foros",          label: "Foros",          icon: MessageSquare },
      { href: "/dashboard/rrhh/vacantes",       label: "Vacantes",       icon: Megaphone     },
    ],
  },
];

interface SidebarProps {
  nombre: string;
  email: string;
  empresaNombre: string | null;
}

export default function Sidebar({ nombre, email, empresaNombre }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openStates, setOpenStates] = useState<boolean[]>(
    () => Array(grupos.length).fill(true)
  );
  const pathname = usePathname();
  const router = useRouter();

  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  function toggleGroup(i: number) {
    setOpenStates((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

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

      {/* Nav con grupos */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        {grupos.map((grupo, gi) => {
          const open = openStates[gi];
          return (
            <div key={grupo.label}>
              {/* Cabecera del grupo */}
              <button
                onClick={() => toggleGroup(gi)}
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
                        <span className="flex-1 truncate">{item.label}</span>
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
        <div className="fixed top-0 left-0 h-screen w-64">{sidebarBody}</div>
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
        <div className="ml-auto w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-xs font-semibold text-accent">
          {initials}
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
