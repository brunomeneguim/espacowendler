"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import { Search, Trash2, Loader2, AlertTriangle, Pencil, UserPlus } from "lucide-react";
import { editarPerfil, excluirMembro, criarUsuario, editarUsuarioCompleto } from "./actions";

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
  telefone?: string | null;
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
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}

function ModalNovoUsuario({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm_password") as string;
    if (password !== confirm) {
      setErro("As senhas não coincidem.");
      return;
    }
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
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
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
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

            {erro && <p className="text-sm text-rust">{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary flex items-center gap-2 flex-1 justify-center"
              >
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
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
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="ativo" defaultValue={profile.ativo ? "true" : "false"} className="input-field">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            {erro && <p className="text-sm text-rust">{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary flex items-center gap-2 flex-1 justify-center"
              >
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

export function EquipeClient({ profiles, currentUserId, currentUserRole }: Props) {
  const [busca, setBusca] = useState("");
  const [excluindo, setExcluindo] = useState<Profile | null>(null);
  const [novoUsuario, setNovoUsuario] = useState(false);
  const [editando, setEditando] = useState<Profile | null>(null);
  const canManage = currentUserRole === "admin" || currentUserRole === "supervisor";
  const isAdmin = currentUserRole === "admin";

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
      {novoUsuario && <ModalNovoUsuario onClose={() => setNovoUsuario(false)} />}
      {editando && <ModalEditarUsuario profile={editando} onClose={() => setEditando(null)} />}

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
          <input
            type="text"
            placeholder="Buscar membro por nome ou e-mail…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-9 h-9 text-sm"
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => setNovoUsuario(true)}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </button>
        )}
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
                  {isAdmin && (
                    <button
                      onClick={() => setEditando(p)}
                      className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-400 hover:text-forest transition-colors"
                      title="Editar usuário completo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
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
