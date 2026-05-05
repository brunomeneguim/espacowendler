"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Clock, AlertCircle,
  Check, Pencil, Trash2, Loader2,
  Calendar, DollarSign, UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { marcarComoPago, excluirLancamento } from "./actions";

export interface Lancamento {
  id: string;
  tipo: string;
  valor: number;
  data_lancamento: string;
  data_vencimento: string | null;
  status: string;
  descricao: string;
  forma_pagamento: string | null;
  categoria: string;
  paciente: { nome_completo: string } | null;
  profissional: { profile: { nome_completo: string } } | null;
  observacoes: string | null;
}

interface Totais {
  receitaPaga: number;
  pendente: number;
  inadimplente: number;
  despesasMes: number;
}

interface Filtros {
  periodo_inicio: string;
  periodo_fim: string;
  tipo: string;
  status: string;
  profissional_id: string;
  sala_id: string;
}

interface ProfissionalItem {
  id: string;
  valor_consulta: number | null;
  valor_aluguel_sala: number | null;
  profile: { nome_completo: string } | null;
}

interface AgendamentoProfissional {
  id: string;
  data_hora_inicio: string;
  status: string;
  pago: boolean;
  forma_pagamento: string | null;
  valor_sessao: number | null;
  aluguel_cobrado: boolean;
  aluguel_valor: number | null;
  paciente: { nome_completo: string } | null;
}

interface AgendamentoPago {
  id: string;
  data_hora_inicio: string;
  valor_sessao: number | null;
  forma_pagamento: string | null;
  aluguel_cobrado: boolean;
  aluguel_valor: number | null;
  profissional_id: string;
  profissional: { id: string; profile: { nome_completo: string } | null } | null;
  paciente: { nome_completo: string } | null;
}

interface ProfTotais {
  totalSessoes: number;
  totalReceita: number;
  totalAluguel: number;
  totalLiquido: number;
}

interface SalaItem { id: number; nome: string; }

interface Props {
  lancamentos: Lancamento[];
  totaisMes: Totais;
  filtros: Filtros;
  isAdmin: boolean;
  profissionais: ProfissionalItem[];
  salas: SalaItem[];
  profAgendamentos: AgendamentoProfissional[];
  profSelecionado: ProfissionalItem | null;
  profTotais: ProfTotais;
  agendamentosPeriodo: AgendamentoPago[];
}

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão crédito", cartao_debito: "Cartão débito",
  transferencia: "Transferência", outros: "Outros",
};

const STATUS_LABEL_AG: Record<string, string> = {
  realizado: "Realizado", finalizado: "Finalizado", faltou: "Falta Cobrada",
};

const STATUS_CLS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-green-100 text-green-700",
  cancelado: "bg-gray-100 text-gray-500",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KpiCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-xs text-forest-500">{label}</p>
      </div>
      <p className={`text-xl font-display font-medium ${color}`}>{value}</p>
    </div>
  );
}

export function FinanceiroClient({ lancamentos, totaisMes, filtros, isAdmin, profissionais, salas, profAgendamentos, profSelecionado, profTotais, agendamentosPeriodo }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [pagarForma, setPagarForma] = useState("pix");
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [localFiltros, setLocalFiltros] = useState<Filtros>(filtros);

  const navegar = useCallback((novo: Filtros) => {
    const params = new URLSearchParams();
    (Object.keys(novo) as (keyof Filtros)[]).forEach(k => { if (novo[k]) params.set(k, novo[k]); });
    router.push(`/financeiro?${params.toString()}`);
  }, [router]);

  function handleChange(key: keyof Filtros, value: string) {
    const novo = { ...localFiltros, [key]: value };
    setLocalFiltros(novo);
    navegar(novo);
  }

  function handleDateChange(key: keyof Filtros, value: string) {
    const novo = { ...localFiltros, [key]: value };
    setLocalFiltros(novo);
    if (value === "" || value.length === 10) navegar(novo);
  }

  return (
    <div className="space-y-6">
      {/* KPIs — do mês atual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Receita recebida (mês)" value={fmt(totaisMes.receitaPaga)}
          icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
        <KpiCard label="Pendente (sessões agendadas)" value={fmt(totaisMes.pendente)}
          icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <KpiCard label="Inadimplente (finalizadas sem pagamento)" value={fmt(totaisMes.inadimplente)}
          icon={AlertCircle} color="text-rust" bg="bg-rust/10" />
        <KpiCard label="Despesas (mês)" value={fmt(totaisMes.despesasMes)}
          icon={TrendingDown} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="label text-xs">De</label>
          <input type="date" value={localFiltros.periodo_inicio}
            onChange={e => handleDateChange("periodo_inicio", e.target.value)}
            className="input-field py-1.5 text-sm" />
        </div>
        <div>
          <label className="label text-xs">Até</label>
          <input type="date" value={localFiltros.periodo_fim}
            onChange={e => handleDateChange("periodo_fim", e.target.value)}
            className="input-field py-1.5 text-sm" />
        </div>
        <div>
          <label className="label text-xs">Tipo</label>
          <select value={localFiltros.tipo} onChange={e => handleChange("tipo", e.target.value)} className="input-field py-1.5 text-sm">
            <option value="">Todos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Status</label>
          <select value={localFiltros.status} onChange={e => handleChange("status", e.target.value)} className="input-field py-1.5 text-sm">
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        {profissionais.length > 0 && (
          <div>
            <label className="label text-xs">Profissional</label>
            <select value={localFiltros.profissional_id} onChange={e => handleChange("profissional_id", e.target.value)} className="input-field py-1.5 text-sm">
              <option value="">Todos</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>
                  {(p.profile as any)?.nome_completo ?? `Profissional ${p.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
        {salas.length > 0 && (
          <div>
            <label className="label text-xs">Sala</label>
            <select value={localFiltros.sala_id} onChange={e => handleChange("sala_id", e.target.value)} className="input-field py-1.5 text-sm">
              <option value="">Todas</option>
              {salas.map(s => (
                <option key={s.id} value={String(s.id)}>{s.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {lancamentos.length === 0 ? (
          <div className="p-10 text-center text-forest-400">
            <p className="text-sm">Nenhum lançamento encontrado para o período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand/30 bg-forest/5 text-xs text-forest-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Descrição</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Referência</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/20">
                {lancamentos.map(l => (
                  <tr key={l.id} className="hover:bg-sand/10 transition-colors">
                    <td className="px-4 py-3 text-forest-500 whitespace-nowrap">
                      {new Date(l.data_lancamento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      {l.data_vencimento && l.status === "pendente" && (
                        <p className="text-[10px] text-amber-600">
                          vence {new Date(l.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-forest">{l.descricao}</p>
                      <p className="text-xs text-forest-400 capitalize">{l.categoria}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-forest-500 hidden sm:table-cell">
                      {l.paciente?.nome_completo && <p>{l.paciente.nome_completo}</p>}
                      {l.profissional?.profile?.nome_completo && (
                        <p className="text-forest-400">{l.profissional.profile.nome_completo}</p>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap
                      ${l.tipo === "receita" ? "text-green-600" : "text-blue-600"}`}>
                      {l.tipo === "despesa" ? "−" : "+"}{fmt(l.valor)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[l.status] ?? ""}`}>
                        {l.status === "pendente" ? "Pendente" : l.status === "pago" ? "Pago" : "Cancelado"}
                      </span>
                      {l.forma_pagamento && l.status === "pago" && (
                        <p className="text-[10px] text-forest-400 mt-0.5">
                          {FORMA_LABELS[l.forma_pagamento] ?? l.forma_pagamento}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {l.status === "pendente" && (
                          <button type="button"
                            onClick={() => { setPagarId(l.id); setPagarForma("pix"); }}
                            className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
                            title="Marcar como pago">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link href={`/financeiro/${l.id}/editar`}
                          className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors"
                          title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        {isAdmin && (
                          <button type="button" onClick={() => setExcluirId(l.id)}
                            className="p-1.5 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust transition-colors"
                            title="Excluir">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Atendimentos pagos no período ── */}
      {agendamentosPeriodo.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border-b border-sand/30">
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-display text-sm text-forest">Atendimentos pagos no período</p>
              <p className="text-xs text-forest-400">{agendamentosPeriodo.length} atendimento{agendamentosPeriodo.length !== 1 ? "s" : ""} · registrados via card da agenda</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand/20 text-left text-xs text-forest-500 uppercase tracking-wider bg-forest/5">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Profissional</th>
                  <th className="px-5 py-3">Forma</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/20">
                {agendamentosPeriodo.map(ag => (
                  <tr key={ag.id} className="hover:bg-cream/40 transition-colors">
                    <td className="px-5 py-3 text-forest whitespace-nowrap">
                      {format(new Date(ag.data_hora_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-5 py-3 text-forest">
                      {ag.paciente?.nome_completo ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-forest-500 text-xs hidden sm:table-cell">
                      {(ag.profissional as any)?.profile?.nome_completo ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-green-700 font-medium">
                        {FORMA_LABELS[ag.forma_pagamento ?? ""] ?? ag.forma_pagamento ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">
                      +{fmt(Number(ag.valor_sessao ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sand/30 bg-green-50/50">
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-forest">Total atendimentos</td>
                  <td className="px-5 py-3 text-right font-bold text-green-600">
                    +{fmt(agendamentosPeriodo.reduce((s, a) => s + Number(a.valor_sessao ?? 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Atendimentos do profissional selecionado ── */}
      {profSelecionado && (
        <div className="space-y-4">
          {/* Section header */}
          <div className="flex items-center gap-2 pt-2">
            <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
              <UserCircle className="w-4 h-4 text-forest" />
            </div>
            <div>
              <p className="text-sm font-semibold text-forest">
                Atendimentos — {(profSelecionado.profile as any)?.nome_completo ?? "Profissional"}
              </p>
              <p className="text-xs text-forest-500">Período selecionado · sessões com status realizado, finalizado ou falta cobrada</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-forest" />
                </div>
                <p className="text-xs text-forest-500">Sessões</p>
              </div>
              <p className="text-2xl font-display font-medium text-forest">{profTotais.totalSessoes}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs text-forest-500">Receita bruta</p>
              </div>
              <p className="text-xl font-display font-medium text-green-600">{fmt(profTotais.totalReceita)}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-forest-500">Aluguel sala</p>
              </div>
              <p className="text-xl font-display font-medium text-amber-600">− {fmt(profTotais.totalAluguel)}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-xs text-forest-500">Líquido</p>
              </div>
              <p className="text-xl font-display font-medium text-teal-600">{fmt(profTotais.totalLiquido)}</p>
            </div>
          </div>

          {/* Tabela de atendimentos */}
          {profAgendamentos.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-sm text-forest-500">Nenhum atendimento encontrado para este profissional no período.</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-3 bg-forest/5 border-b border-sand/30">
                <p className="font-display text-sm text-forest">Detalhamento de sessões</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sand/20 text-left text-xs text-forest-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Data</th>
                      <th className="px-5 py-3">Paciente</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Sessão</th>
                      <th className="px-5 py-3 text-right">Aluguel</th>
                      <th className="px-5 py-3 text-right">Líquido</th>
                      <th className="px-5 py-3">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/20">
                    {profAgendamentos.map(ag => {
                      const valorSessao = Number(ag.valor_sessao ?? profSelecionado.valor_consulta ?? 0);
                      const valorAluguel = ag.aluguel_cobrado ? Number(ag.aluguel_valor ?? profSelecionado.valor_aluguel_sala ?? 50) : 0;
                      const liquido = valorSessao - valorAluguel;
                      const isFalta = ag.status === "faltou";
                      return (
                        <tr key={ag.id} className={`hover:bg-cream/40 transition-colors ${isFalta ? "opacity-60" : ""}`}>
                          <td className="px-5 py-3 text-forest whitespace-nowrap">
                            {format(new Date(ag.data_hora_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </td>
                          <td className="px-5 py-3 text-forest">
                            {ag.paciente?.nome_completo ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              ag.status === "faltou" ? "bg-orange-100 text-orange-700" :
                              ag.status === "finalizado" ? "bg-gray-100 text-gray-600" :
                              "bg-teal-100 text-teal-700"
                            }`}>
                              {STATUS_LABEL_AG[ag.status] ?? ag.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-forest font-medium">
                            {isFalta ? "—" : fmt(valorSessao)}
                          </td>
                          <td className="px-5 py-3 text-right text-amber-600">
                            {ag.aluguel_cobrado ? `− ${fmt(valorAluguel)}` : "—"}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-teal-700">
                            {isFalta ? `− ${fmt(valorAluguel)}` : fmt(liquido)}
                          </td>
                          <td className="px-5 py-3">
                            {ag.pago ? (
                              <span className="text-xs text-green-700 font-medium">
                                {FORMA_LABELS[ag.forma_pagamento ?? ""] ?? ag.forma_pagamento ?? "Pago"}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600">Pendente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal — marcar como pago */}
      {pagarId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setPagarId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-display text-base text-forest">Registrar pagamento</h3>
              <div>
                <label className="label">Forma de pagamento</label>
                <select value={pagarForma} onChange={e => setPagarForma(e.target.value)} className="input-field">
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                  <option value="transferencia">Transferência</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => {
                  startTransition(async () => { await marcarComoPago(pagarId!, pagarForma); setPagarId(null); });
                }} disabled={isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar
                </button>
                <button onClick={() => setPagarId(null)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal — excluir */}
      {excluirId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setExcluirId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-display text-base text-forest">Excluir lançamento?</h3>
              <p className="text-sm text-forest-600">Esta ação é irreversível.</p>
              <div className="flex gap-3">
                <button onClick={() => {
                  startTransition(async () => { await excluirLancamento(excluirId!); setExcluirId(null); });
                }} disabled={isPending}
                  className="flex-1 bg-rust text-cream px-4 py-2 rounded-xl text-sm font-medium hover:bg-rust/90 flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Excluir
                </button>
                <button onClick={() => setExcluirId(null)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
