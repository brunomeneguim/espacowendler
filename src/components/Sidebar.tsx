"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Users,
  UserCircle,
  LayoutDashboard,
  LogOut,
  Leaf,
  Stethoscope,
  CheckSquare,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { signOut } from "@/app/(auth)/actions";

const NAV_ITEMS: Record<
  UserRole,
  Array<{ href: string; label: string; icon: React.ElementType }>
> = {
  admin: [
    { href: "/dashboard", label: "Agenda do dia", icon: Calendar },
    { href: "/agenda", label: "Todos os agendamentos", icon: LayoutDashboard },
    { href: "/pacientes", label: "Pacientes", icon: Users },
    { href: "/profissionais", label: "Profissionais", icon: Stethoscope },
    { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
    { href: "/equipe", label: "Equipe", icon: UserCircle },
  ],
  supervisor: [
    { href: "/dashboard", label: "Agenda do dia", icon: Calendar },
    { href: "/agenda", label: "Todos os agendamentos", icon: LayoutDashboard },
    { href: "/pacientes", label: "Pacientes", icon: Users },
    { href: "/profissionais", label: "Profissionais", icon: Stethoscope },
    { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  ],
  profissional: [
    { href: "/dashboard", label: "Minha agenda", icon: Calendar },
    { href: "/pacientes", label: "Meus pacientes", icon: Users },
    { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  ],
  secretaria: [
    { href: "/dashboard", label: "Agenda do dia", icon: Calendar },
    { href: "/agenda", label: "Todos os agendamentos", icon: LayoutDashboard },
    { href: "/pacientes", label: "Pacientes", icon: Users },
    { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  ],
};

export function Sidebar({
  role,
  nome,
}: {
  role: UserRole;
  nome: string;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] ?? NAV_ITEMS.profissional;

  const roleLabels: Record<UserRole, string> = {
    admin: "Administrador",
    supervisor: "Supervisor",
    profissional: "Profissional",
    secretaria: "Secretaria",
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-forest text-cream min-h-screen sticky top-0">
      <div className="p-6 border-b border-forest-400/20">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-cream/10 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-peach" strokeWidth={1.5} />
          </div>
          <span className="font-display text-lg">
            espaço<span className="italic text-peach">wendler</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-cream/10 text-peach font-medium"
                  : "text-cream/70 hover:text-cream hover:bg-cream/5"
              }`}
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-forest-400/20">
        <div className="px-4 py-3 mb-2">
          <p className="text-xs text-cream/50 uppercase tracking-wider">
            {roleLabels[role]}
          </p>
          <p className="text-sm font-medium truncate">{nome}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-cream/70 hover:text-rust hover:bg-cream/5 transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
