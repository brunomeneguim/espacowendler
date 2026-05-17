"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import {
  ShieldCheck, Loader2, Check, ChevronDown, ChevronUp,
  RotateCcw, Eye, Pencil, Trash2, UserPlus,
  Search, AlertTriangle, UserCheck, X,
} from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { UserRole } from "@/types/database";
import {
  atualizarRole, salvarTodasPermissoes, resetarPermissoes,
  toggleAtivo, excluirMembro, criarUsuario, editarUsuarioCompleto, aprovarPendente,
} from "./actions";

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "admin",        label: "Administrador" },
  { value: "supervisor",   label: "Supervisor"    },
  { value: "profissional", label: "Profissional"  },
  { value: "secretaria",   label: "Secretaria"    },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
  admin:        "Administrador",
  supervisor:   "Supervisor",
  profissional: "Profissional",
  secretaria:   "Secretaria",
};

const ROLE_CORES: Record<UserRole, string> = {
  admin:        "bg-purple-100 text-purple-700 border-purple-200",
  supervisor:   "bg-blue-100 text-blue-700 border-blue-200",
  profissional: "bg-teal-100 text-teal-700 border-teal-200",
  secretaria:   "bg-amber-100 text-amber-700 border-amber-200",
};

const ROLE_ACCESS_DEFAULT: Record<UserRole, string[]> = {
  admin:        ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/equipe", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta", "/configuracoes/acesso", "/configuracoes/metodos-pagamento", "/configuracoes/editar-sistema", "/configuracoes/ocultar-informacoes"],
  supervisor:   ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta", "/configuracoes/ocultar-informacoes"],
  profissional: ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta", "/configuracoes/ocultar-informacoes"],
  secretaria:   ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta", "/configuracoes/ocultar-informacoes"],
};

const PAGINAS = [
  { href: "/dashboard",                          label: "Agenda",               grupo: "Principal" },
  { href: "/pacientes",                          label: "Pacientes",            grupo: "Principal" },
  { href: "/profissionais",                      label: "Profissionais",        grupo: "Principal" },
  { href: "/tarefas",                            label: "Tarefas",              grupo: "Principal" },
  { href: "/salas",                              label: "Salas",                grupo: "Principal" },
  { href: "/financeiro",                         label: "Financeiro",           grupo: "Principal" },
  { href: "/relatorios",                         label: "Relatórios",           grupo: "Principal" },
  { href: "/configuracoes/ocultar-informacoes",  label: "Ocultar Informações",  grupo: "Configurações" },
  { href: "/configuracoes/conta",                label: "Gerenciar Conta",      grupo: "Configurações" },
  { href: "/configuracoes/editar-sistema",       label: "Editar Sidebar",       grupo: "Configurações" },
  { href: "/configuracoes/acesso",               label: "Controle de Acesso",   grupo: "Configurações" },
  { href: "/configuracoes/metodos-pagamento",    label: "Métodos de Pagamento", grupo: "Configurações" },
];

type PermissaoMap = Record<string, { podeVer: boolean; podeEditar: boolean }>;

function buildRoleDefaults(role: UserRole): PermissaoMap {
  const defaults = ROLE_ACCESS_DEFAULT[role] ?? [];
  return Object.fromEntries(
    PAGINAS.map(({ href }) => {
      const podeVer = defaults.includes(href);
      return [href, { podeVer, podeEditar: podeVer }];
    })
  );
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  telefone?: string | null;
  avatar_url?: string | null;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastSistema({ mensagem, visivel }: { mensagem: string; visivel: boolean }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ease-in-out ${
      visivel ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
    }`}>
      <div className="flex items-center gap-2.5 bg-forest text-cream px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
        <Check className="w-4 h-4 text-peach shrink-0" strokeWidth={2.5} />
        {mensagem}
      </div>
    </div>
  );
}

// ── Modal Excluir ─────────────────────────────────────────────────────────────

function ModalExcluir({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      const res = await excluirMembro(profile.id);
      if (res.error) setErro(res.error);
      else onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rust/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rust" />
            </div>
            <div>
              <p className="font-display text-lg text-forest">Excluir usuário</p>
              <p className="text-sm text-forest-600 mt-1">
                Tem certeza que deseja excluir <strong>{profile.nome_completo}</strong>? Esta ação é irreversível e removerá o acesso ao sistema.
              </p>
            </div>
          </div>
          <ErrorBanner message={erro} />
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 bg-rust text-cream px-4 py-2 rounded-xl text-sm font-medium hover:bg-rust/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isPending ? "Excluindo…" : "Sim, excluir"}
            </button>
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Modal Novo Usuário ────────────────────────────────────────────────────────

function ModalNovoUsuario({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm  = fd.get("confirm_password") as string;
    if (password !== confirm) { setErro("As senhas não coincidem."); return; }
    setErro(null);
    startTransition(async () => {
      const res = await criarUsuario(fd);
      if (res.error) setErro(res.error);
      else onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
          <div>
            <p className="font-display text-lg text-forest">Novo Usuário</p>
            <p className="text-sm text-forest-500 mt-1">Preencha os dados para criar o acesso.</p>
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo *</label>
              <input name="nome_completo" required className="input-field" placeholder="Nome completo" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input name="email" type="email" required className="input-field" placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input name="telefone" type="tel" className="input-field" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="label">Papel</label>
              <select name="role" defaultValue="secretaria" className="input-field">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Senha *</label>
              <input name="password" type="password" required minLength={6} className="input-field" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label">Confirmar Senha *</label>
              <input name="confirm_password" type="password" required minLength={6} className="input-field" placeholder="Repita a senha" />
            </div>
            <ErrorBanner message={erro} />
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {isPending ? "Criando…" : "Criar usuário"}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Modal Editar Usuário ──────────────────────────────────────────────────────

function ModalEditarUsuario({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      const res = await editarUsuarioCompleto(profile.id, fd);
      if (res.error) setErro(res.error);
      else onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
          <div>
            <p className="font-display text-lg text-forest">Editar Usuário</p>
            <p className="text-sm text-forest-500 mt-1">Altere os dados do membro da equipe.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo *</label>
              <input name="nome_completo" required defaultValue={profile.nome_completo} className="input-field" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input name="email" type="email" required defaultValue={profile.email} className="input-field" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input name="telefone" type="tel" defaultValue={profile.telefone ?? ""} className="input-field" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="label">Papel</label>
              <select name="role" defaultValue={profile.role} className="input-field">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="ativo" defaultValue={profile.ativo ? "true" : "false"} className="input-field">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <ErrorBanner message={erro} />
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                {isPending ? "Salvando…" : "Salvar alterações"}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Grid de Permissões ────────────────────────────────────────────────────────

function PermissaoGrid({
  profileId,
  role,
  dbPermissoes,
}: {
  profileId: string;
  role: UserRole;
  dbPermissoes: PermissaoMap;
}) {
  const dbHasCustom = Object.keys(dbPermissoes).length > 0;
  const [localHasCustom, setLocalHasCustom] = useState(dbHasCustom);
  const [isActivating, setIsActivating] = useState(false);
  const [localPermissoes, setLocalPermissoes] = useState<PermissaoMap>(() =>
    dbHasCustom ? { ...dbPermissoes } : buildRoleDefaults(role)
  );
  const [saving, startSaveTransition] = useTransition();
  const [resetting, startResetTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const gridVisible = localHasCustom || isActivating;

  function handleAtivar() {
    setLocalPermissoes(buildRoleDefaults(role));
    setIsActivating(true);
    setErro(null);
  }

  function handleCancelar() {
    setIsActivating(false);
    setLocalPermissoes(dbHasCustom ? { ...dbPermissoes } : buildRoleDefaults(role));
    setErro(null);
  }

  function handleToggle(href: string, campo: "podeVer" | "podeEditar") {
    setLocalPermissoes(prev => {
      const atual = prev[href] ?? { podeVer: false, podeEditar: false };
      let novoVer = atual.podeVer;
      let novoEditar = atual.podeEditar;
      if (campo === "podeVer") {
        novoVer = !novoVer;
        if (!novoVer) novoEditar = false;
      } else {
        novoEditar = !novoEditar;
        if (novoEditar) novoVer = true;
      }
      return { ...prev, [href]: { podeVer: novoVer, podeEditar: novoEditar } };
    });
  }

  function handleSalvar() {
    setErro(null);
    setSavedFeedback(false);
    startSaveTransition(async () => {
      const payload = PAGINAS.map(({ href }) => ({
        pagina: href,
        podeVer: localPermissoes[href]?.podeVer ?? false,
        podeEditar: localPermissoes[href]?.podeEditar ?? false,
      }));
      const res = await salvarTodasPermissoes(profileId, payload);
      if (res.error) {
        setErro(res.error);
      } else {
        setLocalHasCustom(true);
        setIsActivating(false);
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 2500);
      }
    });
  }

  function handleDesativar() {
    setErro(null);
    startResetTransition(async () => {
      const res = await resetarPermissoes(profileId);
      if (res.error) { setErro(res.error); return; }
      setLocalHasCustom(false);
      setIsActivating(false);
      setLocalPermissoes(buildRoleDefaults(role));
    });
  }

  const grupos = [...new Set(PAGINAS.map(p => p.grupo))];

  return (
    <div className="border-t border-sand/20 bg-cream/30 px-5 py-4 space-y-4">
      {/* Estado atual */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {localHasCustom || isActivating ? (
            <>
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold text-blue-700">
                {isActivating && !localHasCustom ? "Ativando permissões customizadas…" : "Permissões customizadas"}
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-500">
                Usando padrões da role <strong>{ROLE_LABELS[role]}</strong>
              </span>
            </>
          )}
        </div>
        {!gridVisible && (
          <button
            onClick={handleAtivar}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Ativar permissões customizadas
          </button>
        )}
      </div>

      {/* Grid */}
      {gridVisible && (
        <>
          {grupos.map(grupo => (
            <div key={grupo}>
              <p className="text-[10px] text-forest-400 uppercase tracking-wider mb-1.5 font-medium">
                {grupo}
              </p>
              <div className="rounded-xl border border-sand/30 overflow-hidden bg-white">
                <div className="grid grid-cols-[1fr_64px_64px] text-[10px] text-forest-400 uppercase tracking-wider px-3 py-1.5 bg-gray-50 border-b border-sand/20">
                  <span>Página</span>
                  <span className="flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Ver</span>
                  <span className="flex items-center justify-center gap-1"><Pencil className="w-3 h-3" /> Editar</span>
                </div>
                {PAGINAS.filter(p => p.grupo === grupo).map(({ href, label }) => {
                  const perm = localPermissoes[href] ?? { podeVer: false, podeEditar: false };
                  return (
                    <div
                      key={href}
                      className="grid grid-cols-[1fr_64px_64px] items-center px-3 py-2.5 border-b border-sand/10 last:border-0 hover:bg-cream/20 transition-colors"
                    >
                      <span className="text-sm text-forest">{label}</span>
                      <div className="flex justify-center">
                        <input type="checkbox" checked={perm.podeVer} onChange={() => handleToggle(href, "podeVer")}
                          className="w-4 h-4 rounded accent-forest cursor-pointer" />
                      </div>
                      <div className="flex justify-center">
                        <input type="checkbox" checked={perm.podeEditar} onChange={() => handleToggle(href, "podeEditar")}
                          disabled={!perm.podeVer}
                          className="w-4 h-4 rounded accent-forest cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <ErrorBanner message={erro} />

          <div className="flex items-center justify-between pt-1">
            {localHasCustom ? (
              <button onClick={handleDesativar} disabled={resetting}
                className="flex items-center gap-1.5 text-xs text-forest-400 hover:text-rust transition-colors disabled:opacity-50">
                {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Voltar ao padrão da role
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              {savedFeedback && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="w-3.5 h-3.5" /> Salvo
                </span>
              )}
              {isActivating && !localHasCustom && (
                <button onClick={handleCancelar}
                  className="text-xs px-3 py-1.5 rounded-lg border border-sand/40 text-forest-400 hover:text-forest transition-colors">
                  Cancelar
                </button>
              )}
              <button onClick={handleSalvar} disabled={saving || resetting}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-forest text-cream hover:bg-forest/90 transition-colors disabled:opacity-50 font-medium">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar permissões
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────

// ── Seção de aprovação de pendentes ──────────────────────────────────────────

function PendenteRow({ profile, onAprovar }: { profile: Profile; onAprovar: (id: string, role: UserRole) => void }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [roleEscolhido, setRoleEscolhido] = useState<UserRole>("profissional");

  function handleAprovar() {
    setErro(null);
    startTransition(async () => {
      const res = await aprovarPendente(profile.id, roleEscolhido);
      if (res.error) setErro(res.error);
      else onAprovar(profile.id, roleEscolhido);
    });
  }

  function handleRejeitar() {
    startTransition(async () => {
      const res = await excluirMembro(profile.id);
      if (res.error) setErro(res.error);
      else onAprovar(profile.id, "pendente"); // remove da lista
    });
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream/20 transition-colors flex-wrap">
      {/* Avatar */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.nome_completo}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-amber-700">
            {profile.nome_completo.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-forest truncate">{profile.nome_completo}</p>
        <p className="text-xs text-forest-400 truncate">{profile.email}</p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <select
          value={roleEscolhido}
          onChange={e => setRoleEscolhido(e.target.value as UserRole)}
          disabled={isPending}
          className="text-sm border border-sand/40 rounded-lg px-2.5 py-1.5 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <button
          onClick={handleAprovar}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
          Aprovar
        </button>

        <button
          onClick={handleRejeitar}
          disabled={isPending}
          title="Rejeitar e remover"
          className="p-1.5 rounded-lg border border-sand/40 hover:bg-rust/5 text-forest-400 hover:text-rust transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {erro && <p className="text-xs text-rust w-full text-right">{erro}</p>}
    </li>
  );
}

export function AcessoClient({
  profiles,
  pendentes: pendentesProp,
  currentId,
  permissoesPorPerfil,
}: {
  profiles: Profile[];
  pendentes: (Profile & { avatar_url?: string | null })[];
  currentId: string;
  permissoesPorPerfil: Record<string, PermissaoMap>;
}) {
  const [busca, setBusca] = useState("");
  const [excluindo, setExcluindo]   = useState<Profile | null>(null);
  const [novoUsuario, setNovoUsuario] = useState(false);
  const [editando, setEditando]     = useState<Profile | null>(null);
  const [pendentes, setPendentes]   = useState<(Profile & { avatar_url?: string | null })[]>(pendentesProp);
  const [toast, setToast]           = useState<string | null>(null);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [localRoles, setLocalRoles] = useState<Record<string, UserRole>>(
    () => Object.fromEntries(profiles.map(p => [p.id, p.role]))
  );
  const [localAtivo, setLocalAtivo] = useState<Record<string, boolean>>(
    () => Object.fromEntries(profiles.map(p => [p.id, p.ativo]))
  );
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [pendingAtivo, setPendingAtivo] = useState<string | null>(null);
  const [roleErrors, setRoleErrors] = useState<Record<string, string | null>>({});
  const [isPendingRole, startRoleTransition] = useTransition();
  const [isPendingAtivo, startAtivoTransition] = useTransition();

  function mostrarToast(msg: string) {
    setToast(msg);
    setToastVisivel(true);
    setTimeout(() => setToastVisivel(false), 2500);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleRoleChange(profileId: string, novoRole: UserRole) {
    setPendingRole(profileId);
    setRoleErrors(prev => ({ ...prev, [profileId]: null }));
    startRoleTransition(async () => {
      const res = await atualizarRole(profileId, novoRole);
      setPendingRole(null);
      if (res.error) {
        setRoleErrors(prev => ({ ...prev, [profileId]: res.error }));
      } else {
        setLocalRoles(prev => ({ ...prev, [profileId]: novoRole }));
        mostrarToast("Role atualizado!");
      }
    });
  }

  function handleToggleAtivo(profileId: string) {
    const novoAtivo = !localAtivo[profileId];
    setPendingAtivo(profileId);
    startAtivoTransition(async () => {
      const res = await toggleAtivo(profileId, novoAtivo);
      setPendingAtivo(null);
      if (!res.error) {
        setLocalAtivo(prev => ({ ...prev, [profileId]: novoAtivo }));
        mostrarToast(novoAtivo ? "Usuário ativado!" : "Usuário desativado!");
      }
    });
  }

  function handleAprovar(id: string, _role: UserRole) {
    setPendentes(prev => prev.filter(p => p.id !== id));
  }

  const filtrados = useMemo(() =>
    profiles.filter(p =>
      !busca ||
      p.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      p.email.toLowerCase().includes(busca.toLowerCase())
    ), [profiles, busca]);

  const ativos   = filtrados.filter(p => localAtivo[p.id] ?? p.ativo);
  const inativos = filtrados.filter(p => !(localAtivo[p.id] ?? p.ativo));

  function renderRow(p: Profile) {
    const isMe       = p.id === currentId;
    const isExpanded = expanded.has(p.id);
    const currentRole = localRoles[p.id] ?? p.role;
    const ativo = localAtivo[p.id] ?? p.ativo;
    const isLoadingRole = pendingRole === p.id && isPendingRole;
    const isLoadingAtivo = pendingAtivo === p.id && isPendingAtivo;
    const roleError = roleErrors[p.id];

    return (
      <li key={p.id}>
        <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream/20 transition-colors flex-wrap">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-forest/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-forest">
              {p.nome_completo.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-forest truncate">
              {p.nome_completo}
              {isMe && <span className="ml-2 text-[10px] bg-forest/10 text-forest px-1.5 py-0.5 rounded-full">você</span>}
            </p>
            <p className="text-xs text-forest-400 truncate">{p.email}</p>
          </div>

          {isMe ? (
            /* Próprio usuário: só badges */
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ROLE_CORES[currentRole]}`}>
                {ROLE_LABELS[currentRole]}
              </span>
              <span className="text-xs text-forest-400">● Ativo</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Role select */}
              <div className="flex items-center gap-1.5">
                {isLoadingRole && <Loader2 className="w-3.5 h-3.5 animate-spin text-forest-400" />}
                <select
                  value={currentRole}
                  onChange={e => handleRoleChange(p.id, e.target.value as UserRole)}
                  disabled={isLoadingRole}
                  className="text-sm border border-sand/40 rounded-lg px-2.5 py-1.5 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 hover:border-forest/30 transition-colors"
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Ativo toggle */}
              <button
                onClick={() => handleToggleAtivo(p.id)}
                disabled={isLoadingAtivo}
                title={ativo ? "Clique para desativar" : "Clique para ativar"}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                  ativo
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    : "bg-red-50 border-red-200 text-red-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                }`}
              >
                {isLoadingAtivo
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                {ativo ? "Ativo" : "Inativo"}
              </button>

              {/* Editar */}
              <button
                onClick={() => setEditando(p)}
                title="Editar usuário"
                className="p-1.5 rounded-lg border border-sand/40 hover:bg-forest/5 text-forest-400 hover:text-forest transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {/* Excluir */}
              <button
                onClick={() => setExcluindo(p)}
                title="Excluir usuário"
                className="p-1.5 rounded-lg border border-sand/40 hover:bg-rust/5 text-forest-400 hover:text-rust transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Permissões */}
              <button
                onClick={() => toggleExpanded(p.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors shrink-0 ${
                  isExpanded
                    ? "bg-forest text-cream border-forest"
                    : "border-sand/40 text-forest-400 hover:border-forest/30 hover:text-forest"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Permissões
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {roleError && (
                <p className="text-xs text-rust w-full text-right">{roleError}</p>
              )}
            </div>
          )}
        </div>

        {isExpanded && !isMe && (
          <PermissaoGrid
            profileId={p.id}
            role={currentRole}
            dbPermissoes={permissoesPorPerfil[p.id] ?? {}}
          />
        )}
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <ToastSistema mensagem={toast ?? ""} visivel={toastVisivel} />
      {excluindo  && <ModalExcluir   profile={excluindo} onClose={() => setExcluindo(null)} />}
      {novoUsuario && <ModalNovoUsuario onClose={() => setNovoUsuario(false)} />}
      {editando   && <ModalEditarUsuario profile={editando} onClose={() => setEditando(null)} />}

      {/* Aguardando aprovação */}
      {pendentes.length > 0 && (
        <div className="card p-0 overflow-hidden border-amber-200">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Aguardando aprovação ({pendentes.length})
            </p>
          </div>
          <ul className="divide-y divide-sand/20">
            {pendentes.map(p => (
              <PendenteRow key={p.id} profile={p as Profile} onAprovar={handleAprovar} />
            ))}
          </ul>
        </div>
      )}

      {/* Barra de busca + botão */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-9 h-9 text-sm"
          />
        </div>
        <button
          onClick={() => setNovoUsuario(true)}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Ativos */}
      {ativos.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-sand/20">
            <p className="text-xs font-semibold text-forest-600 uppercase tracking-wider">
              Usuários ativos ({ativos.length})
            </p>
          </div>
          <ul className="divide-y divide-sand/20">
            {ativos.map(renderRow)}
          </ul>
        </div>
      )}

      {/* Inativos */}
      {inativos.length > 0 && (
        <div className="card p-0 overflow-hidden opacity-70">
          <div className="px-5 py-3 bg-gray-50 border-b border-sand/20">
            <p className="text-xs font-semibold text-forest-600 uppercase tracking-wider">
              Usuários inativos ({inativos.length})
            </p>
          </div>
          <ul className="divide-y divide-sand/20">
            {inativos.map(renderRow)}
          </ul>
        </div>
      )}

      {filtrados.length === 0 && (
        <p className="text-center text-sm text-forest-400 py-8">Nenhum usuário encontrado.</p>
      )}
    </div>
  );
}
