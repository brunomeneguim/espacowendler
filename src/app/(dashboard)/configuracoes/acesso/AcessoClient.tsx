"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Loader2, Check } from "lucide-react";
import type { UserRole } from "@/types/database";
import { atualizarRole } from "./actions";

interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

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

export function AcessoClient({
  profiles,
  currentId,
}: {
  profiles: Profile[];
  currentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, string | null>>({});
  const [localRoles, setLocalRoles] = useState<Record<string, UserRole>>(
    () => Object.fromEntries(profiles.map(p => [p.id, p.role]))
  );

  function handleChange(profileId: string, novoRole: UserRole) {
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

      {/* Tabela de usuários ativos */}
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

            return (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream/30 transition-colors">
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
                {/* Role selector */}
                <div className="flex items-center gap-2 shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-forest-400" />
                  ) : feedback === "ok" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : null}
                  <select
                    value={currentRole}
                    onChange={e => handleChange(p.id, e.target.value as UserRole)}
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
                {feedback && feedback !== "ok" && (
                  <p className="text-xs text-rust shrink-0 max-w-36 text-right">{feedback}</p>
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
