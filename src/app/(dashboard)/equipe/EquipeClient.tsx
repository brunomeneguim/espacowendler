"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { Search, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { editarPerfil, excluirMembro } from "./actions";

const ROLES = [
  { value: "admin",        label: "Administrador" },
  { value: "supervisor",   label: "Supervisor"    },
  { value: "profissional", label: "Profissional"  },
  { value: "secretaria",   label: "Secretaria"    },
];

const roleColors: Record<string, string> = {
  admin:        "bg-rust text-cream",
  supervisor:   "bg-forest text-cream",
  profissional: "bg-peach text-rust",
  secretaria:   "bg-sand text-rust",
};

interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  role: string;
  ativo: boolean;
  created_at: string;
}

interface Props {
  profiles: Profile[];
  currentUserId: string;
  currentUserRole: string;
}

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
              <p className="font-display text-lg text-forest">Excluir membro</p>
              <p className="text-sm text-forest-600 mt-1">
                Tem certeza que deseja excluir <strong>{profile.nome_completo}</strong>? Esta ação é irreversível e removerá o acesso ao sistema.
              </p>
            </div>
          </div>

          {erro && <p className="text-sm text-rust">{erro}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 bg-rust text-cream px-4 py-2 rounded-xl text-sm font-medium hover:bg-rust/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isPending ? "Excluindo…" : "Sim, excluir"}
            </button>
            <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function EquipeClient({ profiles, currentUserId, currentUserRole }: Props) {
  const [busca, setBusca] = useState("");
  const [excluindo, setExcluindo] = useState<Profile | null>(null);
  const canManage = currentUserRole === "admin" || currentUserRole === "supervisor";

  const filtrados = useMemo(() =>
    profiles.filter(p =>
      !busca || p.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      p.email?.toLowerCase().includes(busca.toLowerCase())
    ), [profiles, busca]);

  function handleLockedClick() {
    alert("Apenas o Administrador ou Supervisor podem alterar os papéis. Entre em contato com um deles.");
  }

  return (
    <div>
      {excluindo && <ModalExcluir profile={excluindo} onClose={() => setExcluindo(null)} />}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
        <input
          type="text"
          placeholder="Buscar membro por nome ou e-mail…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="input-field pl-9 h-9 text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtrados.map(p => {
          const isSelf = p.id === currentUserId;
          const action = editarPerfil.bind(null, p.id);
          return (
            <div key={p.id} className="card flex flex-wrap items-center gap-4 py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-forest/10 text-forest flex items-center justify-center font-display shrink-0">
                  {p.nome_completo.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-forest truncate">
                    {p.nome_completo}
                    {isSelf && <span className="ml-2 text-xs text-forest-400">(você)</span>}
                  </p>
                  <p className="text-sm text-forest-500 truncate">{p.email}</p>
                </div>
              </div>

              {isSelf || !canManage ? (
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[p.role] ?? "bg-sand/30"}`}>
                    {ROLES.find(r => r.value === p.role)?.label ?? p.role}
                  </span>
                  <span className={`text-xs ${p.ativo ? "text-forest" : "text-rust"}`}>
                    ● {p.ativo ? "ativo" : "inativo"}
                  </span>
                  {!isSelf && !canManage && (
                    <button
                      type="button"
                      onClick={handleLockedClick}
                      className="text-sm bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg cursor-not-allowed border border-gray-200"
                      title="Sem permissão para editar"
                    >
                      Editar
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <form action={action} className="flex items-center gap-2 flex-wrap">
                    <select
                      name="role"
                      defaultValue={p.role}
                      className="text-sm border border-sand/40 rounded-lg px-2 py-1.5 bg-white text-forest focus:outline-none focus:ring-1 focus:ring-forest/30"
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <select
                      name="ativo"
                      defaultValue={p.ativo ? "true" : "false"}
                      className="text-sm border border-sand/40 rounded-lg px-2 py-1.5 bg-white text-forest focus:outline-none focus:ring-1 focus:ring-forest/30"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                    <button
                      type="submit"
                      className="text-sm bg-forest text-cream px-3 py-1.5 rounded-lg hover:bg-forest/90 transition-colors"
                    >
                      Salvar
                    </button>
                  </form>
                  <button
                    onClick={() => setExcluindo(p)}
                    className="p-1.5 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust transition-colors"
                    title="Excluir membro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
