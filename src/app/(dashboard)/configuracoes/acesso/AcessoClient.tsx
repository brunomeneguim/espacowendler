"use client";

import { useState, useTransition } from "react";
import {
  ShieldCheck, Loader2, Check, ChevronDown, ChevronUp,
  RotateCcw, Eye, Pencil, AlertCircle,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { atualizarRole, salvarTodasPermissoes, resetarPermissoes } from "./actions";

interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

type PermissaoMap = Record<string, { podeVer: boolean; podeEditar: boolean }>;

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

const ROLE_DESCRICAO: Record<UserRole, string> = {
  admin:        "Acesso total ao sistema, incluindo configurações.",
  supervisor:   "Gerencia pacientes, profissionais, agenda e financeiro.",
  profissional: "Acessa sua agenda, pacientes, salas e financeiro.",
  secretaria:   "Gerencia agenda, pacientes, salas e financeiro.",
};

const ROLE_ACCESS_DEFAULT: Record<UserRole, string[]> = {
  admin:        ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/equipe", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta"],
  supervisor:   ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta"],
  profissional: ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta"],
  secretaria:   ["/dashboard", "/pacientes", "/profissionais", "/tarefas", "/salas", "/financeiro", "/relatorios", "/configuracoes/conta"],
};

const PAGINAS = [
  { href: "/dashboard",                        label: "Dashboard",            grupo: "Principal" },
  { href: "/pacientes",                        label: "Pacientes",            grupo: "Principal" },
  { href: "/profissionais",                    label: "Profissionais",        grupo: "Principal" },
  { href: "/tarefas",                          label: "Tarefas",              grupo: "Principal" },
  { href: "/equipe",                           label: "Equipe",               grupo: "Principal" },
  { href: "/salas",                            label: "Salas",                grupo: "Principal" },
  { href: "/financeiro",                       label: "Financeiro",           grupo: "Principal" },
  { href: "/relatorios",                       label: "Relatórios",           grupo: "Principal" },
  { href: "/configuracoes/conta",              label: "Gerenciar Conta",      grupo: "Configurações" },
  { href: "/configuracoes/acesso",             label: "Controle de Acesso",   grupo: "Configurações" },
  { href: "/configuracoes/metodos-pagamento",  label: "Métodos de Pagamento", grupo: "Configurações" },
];

function buildRoleDefaults(role: UserRole): PermissaoMap {
  const defaults = ROLE_ACCESS_DEFAULT[role] ?? [];
  return Object.fromEntries(
    PAGINAS.map(({ href }) => {
      const podeVer = defaults.includes(href);
      return [href, { podeVer, podeEditar: podeVer }];
    })
  );
}

// ── Grid de permissões por usuário ────────────────────────────────────────────

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

  // tudo-ou-nada: ou o usuário usa a role, ou tem um conjunto completo customizado
  const [localHasCustom, setLocalHasCustom] = useState(dbHasCustom);
  const [isActivating, setIsActivating] = useState(false);

  // estado local dos checkboxes — iniciado com DB ou defaults da role
  const [localPermissoes, setLocalPermissoes] = useState<PermissaoMap>(() =>
    dbHasCustom ? { ...dbPermissoes } : buildRoleDefaults(role)
  );

  const [saving, startSaveTransition] = useTransition();
  const [resetting, startResetTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const gridVisible = localHasCustom || isActivating;

  function handleAtiviar() {
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

      {/* Cabeçalho do estado */}
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
            onClick={handleAtiviar}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Ativar permissões customizadas
          </button>
        )}
      </div>

      {/* Grid de páginas */}
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
                  <span className="flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> Ver
                  </span>
                  <span className="flex items-center justify-center gap-1">
                    <Pencil className="w-3 h-3" /> Editar
                  </span>
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
                        <input
                          type="checkbox"
                          checked={perm.podeVer}
                          onChange={() => handleToggle(href, "podeVer")}
                          className="w-4 h-4 rounded accent-forest cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={perm.podeEditar}
                          onChange={() => handleToggle(href, "podeEditar")}
                          disabled={!perm.podeVer}
                          className="w-4 h-4 rounded accent-forest cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 text-xs text-rust">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {erro}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between pt-1">
            {/* Desativar (só quando já tem custom salvo) */}
            {localHasCustom ? (
              <button
                onClick={handleDesativar}
                disabled={resetting}
                className="flex items-center gap-1.5 text-xs text-forest-400 hover:text-rust transition-colors disabled:opacity-50"
              >
                {resetting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RotateCcw className="w-3.5 h-3.5" />}
                Voltar ao padrão da role
              </button>
            ) : (
              <div /> /* spacer */
            )}

            <div className="flex items-center gap-2">
              {savedFeedback && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="w-3.5 h-3.5" /> Salvo
                </span>
              )}

              {/* Cancelar (só quando ativando pela primeira vez, sem custom salvo) */}
              {isActivating && !localHasCustom && (
                <button
                  onClick={handleCancelar}
                  className="text-xs px-3 py-1.5 rounded-lg border border-sand/40 text-forest-400 hover:text-forest transition-colors"
                >
                  Cancelar
                </button>
              )}

              <button
                onClick={handleSalvar}
                disabled={saving || resetting}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-forest text-cream hover:bg-forest/90 transition-colors disabled:opacity-50 font-medium"
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                Salvar permissões
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AcessoClient({
  profiles,
  currentId,
  permissoesPorPerfil,
}: {
  profiles: Profile[];
  currentId: string;
  permissoesPorPerfil: Record<string, PermissaoMap>;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, string | null>>({});
  const [localRoles, setLocalRoles] = useState<Record<string, UserRole>>(
    () => Object.fromEntries(profiles.map(p => [p.id, p.role]))
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleRoleChange(profileId: string, novoRole: UserRole) {
    if (profileId === currentId) return;
    setPendingId(profileId);
    setFeedbacks(prev => ({ ...prev, [profileId]: null }));
    startTransition(async () => {
      const res = await atualizarRole(profileId, novoRole);
      setPendingId(null);
      if (res.error) {
        setFeedbacks(prev => ({ ...prev, [profileId]: res.error }));
      } else {
        setLocalRoles(prev => ({ ...prev, [profileId]: novoRole }));
        setFeedbacks(prev => ({ ...prev, [profileId]: "ok" }));
        setTimeout(() => setFeedbacks(prev => ({ ...prev, [profileId]: null })), 2000);
      }
    });
  }

  const ativos   = profiles.filter(p => p.ativo);
  const inativos = profiles.filter(p => !p.ativo);

  return (
    <div className="space-y-6">
      {/* Legenda de roles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
          <div key={role} className={`rounded-xl border px-3 py-2.5 ${ROLE_CORES[role]}`}>
            <p className="text-xs font-semibold">{label}</p>
            <p className="text-[11px] opacity-75 mt-0.5 leading-tight">{ROLE_DESCRICAO[role]}</p>
          </div>
        ))}
      </div>

      {/* Usuários ativos */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-sand/20">
          <p className="text-xs font-semibold text-forest-600 uppercase tracking-wider">
            Usuários ativos ({ativos.length})
          </p>
        </div>
        <ul className="divide-y divide-sand/20">
          {ativos.map(p => {
            const isMe = p.id === currentId;
            const isLoading = pendingId === p.id && isPending;
            const feedback = feedbacks[p.id];
            const currentRole = localRoles[p.id] ?? p.role;
            const isExpanded = expanded.has(p.id);

            return (
              <li key={p.id}>
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream/20 transition-colors">
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
                      {isMe && (
                        <span className="ml-2 text-[10px] bg-forest/10 text-forest px-1.5 py-0.5 rounded-full">
                          você
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-forest-400 truncate">{p.email}</p>
                  </div>

                  {/* Role selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-forest-400" />
                    ) : feedback === "ok" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : null}
                    <select
                      value={currentRole}
                      onChange={e => handleRoleChange(p.id, e.target.value as UserRole)}
                      disabled={isMe || isLoading}
                      className={`text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 transition-colors ${
                        isMe
                          ? "border-sand/30 text-forest-400 cursor-not-allowed"
                          : "border-sand/40 text-forest hover:border-forest/30"
                      }`}
                    >
                      {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                        <option key={role} value={role}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle permissões */}
                  {!isMe && (
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
                      {isExpanded
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}

                  {feedback && feedback !== "ok" && (
                    <p className="text-xs text-rust shrink-0 max-w-36 text-right">{feedback}</p>
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
          })}
        </ul>
      </div>

      {/* Usuários inativos */}
      {inativos.length > 0 && (
        <div className="card p-0 overflow-hidden opacity-60">
          <div className="px-5 py-3 bg-gray-50 border-b border-sand/20">
            <p className="text-xs font-semibold text-forest-600 uppercase tracking-wider">
              Usuários inativos ({inativos.length})
            </p>
          </div>
          <ul className="divide-y divide-sand/20">
            {inativos.map(p => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3 text-forest-400">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold">{p.nome_completo.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.nome_completo}</p>
                  <p className="text-xs truncate">{p.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_CORES[p.role]}`}>
                  {ROLE_LABELS[p.role]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
