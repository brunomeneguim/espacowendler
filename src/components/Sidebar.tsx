"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar, Users, UserCircle, LogOut, Leaf,
  Stethoscope, CheckSquare, Settings2, Check,
  ChevronUp, ChevronDown, X, Pencil, Building2, GripVertical,
  DollarSign, BarChart2, Eye, EyeOff, ShieldCheck, CreditCard,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { signOut } from "@/app/(auth)/actions";
import { salvarMenuConfig } from "@/app/(dashboard)/menuConfigActions";
import type { MenuItem } from "@/app/(dashboard)/menuConfigActions";
import { usePrivacyMode } from "@/app/(dashboard)/PrivacyContext";

// ── Mapeamento de ícones (string → componente) ────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Calendar, Users, UserCircle, Stethoscope, CheckSquare, Building2, DollarSign, BarChart2,
};

// ── Quais hrefs cada role pode ver ───────────────────────────────
const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin:       ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/equipe", "/salas", "/financeiro", "/relatorios"],
  supervisor:  ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios"],
  profissional:["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios"],
  secretaria:  ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios"],
};

// Label customizada por role para /dashboard e /pacientes
const ROLE_LABEL_OVERRIDE: Record<UserRole, Partial<Record<string, string>>> = {
  admin:        {},
  supervisor:   {},
  profissional: { "/dashboard": "Minha agenda", "/pacientes": "Meus pacientes" },
  secretaria:   {},
};

export function Sidebar({
  role,
  nome,
  menuConfig,
}: {
  role: UserRole;
  nome: string;
  menuConfig: MenuItem[];
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // ── Edit mode (admin only) ────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [configAberto, setConfigAberto] = useState(false);
  const [editItems, setEditItems] = useState<MenuItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  const { privacyMode, setPrivacyMode } = usePrivacyMode();

  const isAdmin = role === "admin";
  const access = ROLE_ACCESS[role] ?? ROLE_ACCESS.profissional;
  const overrides = ROLE_LABEL_OVERRIDE[role] ?? {};

  // Fechar configurações a cada navegação
  useEffect(() => {
    setConfigAberto(false);
  }, [pathname]);

  // Filter and sort menu items based on role access
  const visibleItems = menuConfig
    .filter(item => access.includes(item.href))
    .sort((a, b) => a.ordem - b.ordem);

  function enterEditMode() {
    // Clone full menuConfig for editing (all items, not just visible)
    setEditItems(menuConfig.map(i => ({ ...i })).sort((a, b) => a.ordem - b.ordem));
    setSaveError(null);
    setSaved(false);
    setEditMode(true);
  }

  function handleDragStart(idx: number) {
    dragIndexRef.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === idx) return;
    const next = [...editItems];
    const [removed] = next.splice(from, 1);
    next.splice(idx, 0, removed);
    next.forEach((item, i) => { item.ordem = i; });
    dragIndexRef.current = idx;
    setEditItems(next);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
  }

  function renameItem(id: number, label: string) {
    setEditItems(prev => prev.map(i => i.id === id ? { ...i, label } : i));
  }

  function handleSave() {
    setSaveError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await salvarMenuConfig(
        editItems.map(i => ({ id: i.id, label: i.label, ordem: i.ordem }))
      );
      if (res.error) { setSaveError(res.error); }
      else { setSaved(true); setEditMode(false); }
    });
  }

  const roleLabels: Record<UserRole, string> = {
    admin: "Administrador",
    supervisor: "Supervisor",
    profissional: "Profissional",
    secretaria: "Secretaria",
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-forest text-cream min-h-screen sticky top-0">
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {!editMode ? (
          // ── Normal mode ──
          visibleItems.map(item => {
            const Icon = ICON_MAP[item.icon_name] ?? Calendar;
            const label = overrides[item.href] ?? item.label;
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
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {label}
              </Link>
            );
          })
        ) : (
          // ── Edit mode (admin) ──
          <div className="space-y-1.5">
            <p className="text-xs text-cream/40 uppercase tracking-wider px-2 mb-3">
              Arraste para reordenar
            </p>
            {editItems.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="bg-cream/5 rounded-xl px-2 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing"
              >
                {/* Drag handle */}
                <GripVertical className="w-3.5 h-3.5 text-cream/40 shrink-0" />
                {/* Icon */}
                {(() => { const Icon = ICON_MAP[item.icon_name] ?? Calendar; return <Icon className="w-3.5 h-3.5 text-cream/50 shrink-0" strokeWidth={1.5} />; })()}
                {/* Label input */}
                <input
                  type="text"
                  value={item.label}
                  onChange={e => renameItem(item.id, e.target.value)}
                  className="flex-1 bg-transparent text-cream text-sm focus:outline-none border-b border-cream/20 focus:border-peach/60 pb-0.5 min-w-0"
                />
              </div>
            ))}

            {saveError && <p className="text-xs text-rust mt-2 px-2">{saveError}</p>}

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-3">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-peach text-forest text-xs font-semibold hover:bg-peach/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Salvando…" : <><Check className="w-3.5 h-3.5" /> Salvar</>}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-2 rounded-xl bg-cream/10 text-cream/70 hover:text-cream hover:bg-cream/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-forest-400/20">
        <div className="px-4 py-3 mb-2">
          <p className="text-xs text-cream/50 uppercase tracking-wider">
            {roleLabels[role]}
          </p>
          <p className="text-sm font-medium truncate">{nome}</p>
        </div>

        {/* Configurações collapsible */}
        <div className="mb-1">
          <button
            onClick={() => setConfigAberto(o => !o)}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-cream/70 hover:text-cream hover:bg-cream/5 transition-colors"
          >
            <Settings2 className="w-4 h-4" strokeWidth={1.5} />
            <span className="flex-1 text-left">Configurações</span>
            {configAberto
              ? <ChevronUp className="w-3.5 h-3.5 text-cream/50" />
              : <ChevronDown className="w-3.5 h-3.5 text-cream/50" />}
          </button>

          {configAberto && (
            <div className="mt-0.5 ml-4 space-y-0.5">
              <button
                type="button"
                onClick={() => setPrivacyMode(v => !v)}
                className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm transition-colors ${
                  privacyMode
                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    : "text-cream/70 hover:text-cream hover:bg-cream/5"
                }`}
              >
                {privacyMode ? <Eye className="w-4 h-4" strokeWidth={1.5} /> : <EyeOff className="w-4 h-4" strokeWidth={1.5} />}
                {privacyMode ? "Mostrar informações" : "Ocultar informações"}
              </button>

              <Link
                href="/configuracoes/conta"
                className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm text-cream/70 hover:text-cream hover:bg-cream/5 transition-colors"
              >
                <UserCircle className="w-4 h-4" strokeWidth={1.5} />
                Gerenciar Conta
              </Link>

              {isAdmin && !editMode && (
                <>
                  <button
                    onClick={() => { setConfigAberto(false); enterEditMode(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm text-cream/70 hover:text-cream hover:bg-cream/5 transition-colors"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={1.5} />
                    Editar Sistema
                  </button>
                  <Link
                    href="/configuracoes/acesso"
                    className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm transition-colors ${
                      pathname.startsWith("/configuracoes/acesso")
                        ? "bg-cream/10 text-peach font-medium"
                        : "text-cream/70 hover:text-cream hover:bg-cream/5"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                    Controle de Acesso
                  </Link>
                  <Link
                    href="/configuracoes/metodos-pagamento"
                    className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm transition-colors ${
                      pathname.startsWith("/configuracoes/metodos-pagamento")
                        ? "bg-cream/10 text-peach font-medium"
                        : "text-cream/70 hover:text-cream hover:bg-cream/5"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                    Métodos de Pagamento
                  </Link>
                </>
              )}
            </div>
          )}
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
