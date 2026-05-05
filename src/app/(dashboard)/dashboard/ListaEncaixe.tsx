"use client";

import { useState, useTransition } from "react";
import { UserPlus, Search, Trash2, Loader2, ChevronDown, ChevronUp, Phone, FileText, User, Pencil, Check, X, CalendarPlus } from "lucide-react";
import { adicionarEncaixe, removerEncaixe, editarEncaixe } from "./listaEncaixeActions";
import type { Encaixe } from "./DashboardContent";

interface Profissional {
  id: string;
  profile: { nome_completo: string } | null;
}

interface ReagendarInfo {
  pacienteId?: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  encaixeId?: string;
  duracaoMin?: number;
  tipoAgendamento?: string;
  observacoes?: string | null;
}

interface Props {
  encaixes: Encaixe[];           // controlado pelo pai (DashboardContent)
  profissionais: Profissional[];
  onReagendar?: (info: ReagendarInfo) => void;
  onAddEncaixe: (enc: Encaixe) => void;
  onRemoveEncaixe: (id: string) => void;
  onUpdateEncaixe: (enc: Encaixe) => void;
}

function maskPhone(v: string) {
  const raw = v.replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) return "+" + raw.slice(1).replace(/\D/g, "");
  const d = raw.replace(/\D/g, "").substring(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function ListaEncaixe({ encaixes, profissionais, onReagendar, onAddEncaixe, onRemoveEncaixe, onUpdateEncaixe }: Props) {
  const [isPending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroProf, setFiltroProf] = useState("todos");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // ── Estado de edição inline ──
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTel, setEditTel] = useState("");
  const [editObs, setEditObs] = useState("");
  const [editProfId, setEditProfId] = useState("");
  const [editErro, setEditErro] = useState<string | null>(null);

  const filtrados = encaixes.filter(e => {
    const q = busca.toLowerCase();
    const matchBusca = e.paciente_nome.toLowerCase().includes(q) || (e.telefone ?? "").includes(q);
    const matchProf = filtroProf === "todos" || e.profissional_id === filtroProf;
    return matchBusca && matchProf;
  });

  function iniciarEdicao(e: Encaixe) {
    setEditandoId(e.id);
    setEditNome(e.paciente_nome);
    setEditTel(e.telefone ?? "");
    setEditObs(e.observacoes ?? "");
    setEditProfId(e.profissional_id ?? "");
    setEditErro(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditErro(null);
  }

  function handleSalvarEdicao(id: string) {
    if (!editNome.trim()) { setEditErro("Nome é obrigatório."); return; }
    setEditErro(null);
    const prof = profissionais.find(p => p.id === editProfId) ?? null;
    startTransition(async () => {
      const res = await editarEncaixe(id, {
        paciente_nome: editNome.trim(),
        telefone: editTel || null,
        observacoes: editObs || null,
        profissional_id: editProfId || null,
      });
      if (res.error) { setEditErro(res.error); return; }
      // Notifica pai com item atualizado
      const encAtual = encaixes.find(e => e.id === id);
      if (encAtual) {
        onUpdateEncaixe({
          ...encAtual,
          paciente_nome: editNome.trim(),
          telefone: editTel || null,
          observacoes: editObs || null,
          profissional_id: editProfId || null,
          profissional: prof ? { profile: prof.profile } : null,
        });
      }
      setEditandoId(null);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      const res = await adicionarEncaixe(fd);
      if (res.error) { setErro(res.error); return; }
      const profId = fd.get("profissional_id") as string;
      const prof = profissionais.find(p => p.id === profId) ?? null;
      // Notifica pai com novo item (usa ID real do servidor)
      onAddEncaixe({
        id: res.id ?? crypto.randomUUID(),
        paciente_nome: fd.get("paciente_nome") as string,
        telefone: (fd.get("telefone") as string) || null,
        observacoes: (fd.get("observacoes") as string) || null,
        profissional_id: profId || null,
        created_at: new Date().toISOString(),
        profissional: prof ? { profile: prof.profile } : null,
      });
      setShowForm(false);
      setTelefone("");
      (e.target as HTMLFormElement).reset();
    });
  }

  function handleRemover(id: string) {
    // Otimista: remove do pai imediatamente
    onRemoveEncaixe(id);
    startTransition(async () => { await removerEncaixe(id); });
  }

  return (
    <div className="rounded-xl border border-sand/40 bg-white shadow-sm overflow-hidden mb-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-peach/20 hover:bg-peach/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-rust" />
          <span className="text-sm font-semibold text-forest">Lista de Encaixe</span>
          {encaixes.length > 0 && (
            <span className="text-xs bg-rust text-white px-2 py-0.5 rounded-full font-medium">
              {encaixes.length}
            </span>
          )}
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-forest-400" /> : <ChevronDown className="w-4 h-4 text-forest-400" />}
      </button>

      {aberto && (
        <div className="p-3 space-y-3">
          {/* Barra de busca + filtro profissional + botão adicionar */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-forest-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="input-field pl-8 py-1.5 text-sm"
              />
            </div>
            <select
              value={filtroProf}
              onChange={e => setFiltroProf(e.target.value)}
              className="h-[34px] text-sm border border-sand/40 rounded-lg px-2 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 shrink-0"
            >
              <option value="todos">Todos os profissionais</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.profile?.nome_completo}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-rust text-white rounded-lg hover:bg-rust/90 transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>

          {/* Formulário de adição */}
          {showForm && (
            <form onSubmit={handleSubmit} className="p-3 bg-sand/10 rounded-xl border border-sand/30 space-y-2.5">
              {erro && <p className="text-xs text-rust">{erro}</p>}
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-forest-600 mb-1 block">
                    Nome do paciente <span className="text-rust">*</span>
                  </label>
                  <input name="paciente_nome" type="text" required placeholder="Nome completo" className="input-field py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-forest-600 mb-1 block">Telefone</label>
                  <input name="telefone" type="text" placeholder="(42) 00000-0000" className="input-field py-1.5 text-sm"
                    value={telefone} onChange={e => setTelefone(maskPhone(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-forest-600 mb-1 block">Profissional</label>
                <select name="profissional_id" className="input-field py-1.5 text-sm" defaultValue="">
                  <option value="">— Qualquer profissional —</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.profile?.nome_completo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-forest-600 mb-1 block">Observações</label>
                <textarea name="observacoes" rows={2} placeholder="Urgência, especialidade, etc." className="input-field py-1.5 text-sm resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-forest text-white rounded-lg hover:bg-forest/90 disabled:opacity-50 transition-colors">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Adicionar à lista
                </button>
                <button type="button" onClick={() => { setShowForm(false); setErro(null); }}
                  className="inline-flex items-center justify-center px-4 py-1.5 bg-peach text-rust text-sm font-medium rounded-full hover:bg-peach-600 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista */}
          {filtrados.length === 0 ? (
            <p className="text-sm text-forest-400 text-center py-4">
              {busca || filtroProf !== "todos" ? "Nenhum resultado encontrado." : "Nenhum paciente na lista de encaixe."}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filtrados.map((e, i) => (
                <div key={e.id} className="rounded-lg border border-sand/20 bg-sand/10 overflow-hidden">
                  {editandoId === e.id ? (
                    /* ── Formulário de edição inline ── */
                    <div className="p-2.5 space-y-2">
                      {editErro && <p className="text-xs text-rust">{editErro}</p>}
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium text-forest-600 mb-0.5 block">Nome <span className="text-rust">*</span></label>
                          <input type="text" value={editNome} onChange={e2 => setEditNome(e2.target.value)}
                            className="input-field py-1 text-sm" placeholder="Nome completo" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-forest-600 mb-0.5 block">Telefone</label>
                          <input type="text" value={editTel} onChange={e2 => setEditTel(maskPhone(e2.target.value))}
                            className="input-field py-1 text-sm" placeholder="(42) 00000-0000" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-forest-600 mb-0.5 block">Profissional</label>
                        <select value={editProfId} onChange={e2 => setEditProfId(e2.target.value)} className="input-field py-1 text-sm">
                          <option value="">— Qualquer profissional —</option>
                          {profissionais.map(p => (
                            <option key={p.id} value={p.id}>{p.profile?.nome_completo}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-forest-600 mb-0.5 block">Observações</label>
                        <textarea rows={2} value={editObs} onChange={e2 => setEditObs(e2.target.value)}
                          className="input-field py-1 text-sm resize-none" placeholder="Urgência, especialidade, etc." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSalvarEdicao(e.id)} disabled={isPending}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-forest text-white rounded-lg hover:bg-forest/90 disabled:opacity-50 transition-colors">
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Salvar
                        </button>
                        <button onClick={cancelarEdicao}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-peach text-rust text-xs font-medium rounded-full hover:bg-peach-600 transition-all">
                          <X className="w-3 h-3" /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Exibição normal ── */
                    <div className="flex items-start gap-2 p-2.5 hover:bg-sand/20 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-rust/15 text-rust text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-forest truncate">{e.paciente_nome}</span>
                          {e.profissional?.profile?.nome_completo && (
                            <span className="text-xs bg-forest/10 text-forest px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <User className="w-2.5 h-2.5" />
                              {e.profissional.profile.nome_completo}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {e.telefone && (
                            <span className="text-xs text-forest-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {e.telefone}
                            </span>
                          )}
                          {e.observacoes && (
                            <span className="text-xs text-forest-400 flex items-center gap-1 truncate max-w-48">
                              <FileText className="w-3 h-3 shrink-0" /> {e.observacoes}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {onReagendar && e.profissional_id && (
                          <button
                            onClick={() => {
                              onReagendar({
                                pacienteNome: e.paciente_nome,
                                profissionalId: e.profissional_id!,
                                profissionalNome: e.profissional?.profile?.nome_completo ?? "Profissional",
                                encaixeId: e.id,
                                duracaoMin: 60,
                                tipoAgendamento: "consulta_avulsa",
                                observacoes: e.observacoes ?? null,
                              });
                              // Fecha a lista para o usuário ver a agenda
                              setAberto(false);
                            }}
                            className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Agendar — próximo clique na agenda"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => iniciarEdicao(e)}
                          className="p-1 text-forest-300 hover:text-forest hover:bg-forest/10 rounded-lg transition-colors"
                          title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleRemover(e.id)}
                          className="p-1 text-forest-300 hover:text-rust hover:bg-rust/10 rounded-lg transition-colors"
                          title="Remover da lista">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
