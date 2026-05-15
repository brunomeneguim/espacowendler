"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Clock, AlertCircle,
  Check, Pencil, Trash2, Loader2,
  Calendar, DollarSign, UserCircle,
  ChevronLeft, ChevronRight, CreditCard, Banknote,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { marcarComoPago, excluirLancamento, registrarPagamentoInadimplente } from "./actions";

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
  despesasPeriodo: number;
  saldoLiquido: number;
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

interface AgendamentoInadimplente {
  id: string;
  data_hora_inicio: string;
  valor_sessao: number | null;
  profissional_id: string;
  sala_id?: string | null;
  paciente: { nome_completo: string } | null;
  profissional: { profile: { nome_completo: string } | null } | null;
}

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
  inadimplentes: AgendamentoInadimplente[];
}

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão crédito", cartao_debito: "Cartão débito",
  transferencia: "Transferência", outros: "Outros",
};

const STATUS_LABEL_AG: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado",
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

function KpiCard({ label, value, icon: Icon, color, bg, subtext }: {
  label: string; value: string;
  icon: React.ElementType; color: string; bg: string; subtext?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-xs text-forest-500 leading-tight">{label}</p>
      </div>
      <p className={`text-xl font-display font-medium ${color}`}>{value}</p>
      {subtext && <p className="text-[11px] text-forest-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

/** Calcula primeiro e último dia do mês a partir de uma data YYYY-MM-DD */
function monthBounds(dateStr: string): { inicio: string; fim: string } {
  const [y, m] = dateStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  return { inicio: `${y}-${mm}-01`, fim: `${y}-${mm}-${dd}` };
}

export function FinanceiroClient({ lancamentos, totaisMes, filtros, isAdmin, profissionais, salas, profAgendamentos, profSelecionado, profTotais, agendamentosPeriodo, inadimplentes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [pagarForma, setPagarForma] = useState("pix");
  const [pagarInadimplenteId, setPagarInadimplenteId] = useState<string | null>(null);
  const [pagarInadimplenteForma, setPagarInadimplenteForma] = useState("pix");
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [localFiltros, setLocalFiltros] = useState<Filtros>(filtros);

  // Mapa profissional_id → valor_consulta para fallback quando valor_sessao é null
  const profValorMap = new Map(
    profissionais.map(p => [p.id, Number(p.valor_consulta ?? 0)])
  );
  function valorInadimplente(ag: AgendamentoInadimplente) {
    return Number(ag.valor_sessao ?? profValorMap.get(ag.profissional_id) ?? 0);
  }
  function valorAtendimento(ag: AgendamentoPago) {
    const sessao  = Number(ag.valor_sessao ?? profValorMap.get(ag.profissional_id) ?? 0);
    const aluguel = ag.aluguel_cobrado ? Number(ag.aluguel_valor ?? 0) : 0;
    return sessao + aluguel;
  }

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

  /** Avança ou recua N meses a partir do mês atual do filtro */
  function shiftMonth(delta: number) {
    const [y, m] = localFiltros.periodo_inicio.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const { inicio, fim } = monthBounds(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    const novo = { ...localFiltros, periodo_inicio: inicio, periodo_fim: fim };
    setLocalFiltros(novo);
    navegar(novo);
  }

  function goToCurrentMonth() {
    const now = new Date();
    const { inicio, fim } = monthBounds(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    const novo = { ...localFiltros, periodo_inicio: inicio, periodo_fim: fim };
    setLocalFiltros(novo);
    navegar(novo);
  }

  // Saldo: positivo = teal, negativo = rust
  const saldoPositivo = totaisMes.saldoLiquido >= 0;

  // Rótulo do mês/período para exibição
  const periodoLabel = (() => {
    try {
      const ini = new Date(localFiltros.periodo_inicio + "T12:00:00");
      const fim = new Date(localFiltros.periodo_fim + "T12:00:00");
      const mesIni = format(ini, "MMM/yy", { locale: ptBR });
      const mesFim = format(fim, "MMM/yy", { locale: ptBR });
      return mesIni === mesFim ? format(ini, "MMMM 'de' yyyy", { locale: ptBR }) : `${mesIni} – ${mesFim}`;
    } catch { return ""; }
  })();

  return (
    <div className="space-y-6">
      {/* ── Navegação de período ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => shiftMonth(-1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sand/40 bg-white text-forest-600 hover:bg-sand/20 text-xs font-medium transition-colors"
          title="Mês anterior">
          <ChevronLeft className="w-3.5 h-3.5" /> Anterior
        </button>
        <button
          onClick={goToCurrentMonth}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sand/40 bg-white text-forest-600 hover:bg-sand/20 text-xs font-medium transition-colors"
          title="Mês atual">
          Mês atual
        </button>
        <button
          onClick={() => shiftMonth(1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sand/40 bg-white text-forest-600 hover:bg-sand/20 text-xs font-medium transition-colors"
          title="Próximo mês">
          Próximo <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {periodoLabel && (
          <span className="text-sm font-medium text-forest capitalize ml-1">{periodoLabel}</span>
        )}
      </div>

      {/* ── KPIs do período ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Receita recebida" value={fmt(totaisMes.receitaPaga)}
          icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
        <KpiCard label="A receber" value={fmt(totaisMes.pendente)}
          icon={Clock} color="text-amber-600" bg="bg-amber-50"
          subtext="sessões agendadas" />
        <KpiCard label="Inadimplente" value={fmt(totaisMes.inadimplente)}
          icon={AlertCircle} color="text-rust" bg="bg-rust/10"
          subtext="finalizadas sem pagamento" />
        <KpiCard label="Despesas" value={fmt(totaisMes.despesasPeriodo)}
          icon={TrendingDown} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard
          label="Saldo líquido"
          value={fmt(totaisMes.saldoLiquido)}
          icon={saldoPositivo ? Banknote : TrendingDown}
          color={saldoPositivo ? "text-teal-600" : "text-rust"}
          bg={saldoPositivo ? "bg-teal-50" : "bg-rust/10"}
          subtext="receita − despesas"
        />
      </div>

      {/* ── Filtros ── */}
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

      {/* ── Tabela de lançamentos ── */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 bg-forest/5 border-b border-sand/30">
          <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 text-forest" />
          </div>
          <div>
            <p className="font-display text-sm text-forest">Lançamentos financeiros</p>
            <p className="text-xs text-forest-400">
              {lancamentos.length === 0
                ? "Nenhum lançamento no período"
                : `${lancamentos.length} lançamento${lancamentos.length !== 1 ? "s" : ""} encontrado${lancamentos.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {lancamentos.length === 0 ? (
          <div className="p-10 text-center text-forest-400">
            <p className="text-sm">Nenhum lançamento para os filtros selecionados.</p>
            <Link href="/financeiro/novo" className="text-xs text-forest-500 underline mt-1 inline-block hover:text-forest">
              Criar novo lançamento
            </Link>
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
                      {l.observacoes && (
                        <p className="text-[11px] text-forest-400 italic mt-0.5 max-w-xs truncate" title={l.observacoes}>
                          {l.observacoes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-forest-500 hidden sm:table-cell">
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

      {/* ── Atendimentos pagos no período ──
          Ocultar quando tipo=despesa (atendimentos são sempre receita)
          ou quando profissional está filtrado (a seção abaixo já detalha tudo) */}
      {agendamentosPeriodo.length > 0 && filtros.tipo !== "despesa" && !filtros.profissional_id && (
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
                    <td className="px-5 py-3 text-forest-500 hidden sm:table-cell">
                      {(ag.profissional as any)?.profile?.nome_completo ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-green-700 font-medium">
                        {FORMA_LABELS[ag.forma_pagamento ?? ""] ?? ag.forma_pagamento ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-green-600">
                      +{fmt(valorAtendimento(ag))}
                      {ag.aluguel_cobrado && ag.aluguel_valor && (
                        <p className="text-[10px] text-forest-400 font-normal mt-0.5">
                          sessão + {fmt(Number(ag.aluguel_valor))} sala
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sand/30 bg-green-50/50">
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-forest">Total atendimentos</td>
                  <td className="px-5 py-3 text-right font-bold text-green-600">
                    +{fmt(agendamentosPeriodo.reduce((s, a) => s + valorAtendimento(a), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Inadimplentes do período ──
          Ocultar quando tipo=despesa */}
      {inadimplentes.length > 0 && filtros.tipo !== "despesa" && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-rust/5 border-b border-sand/30">
            <div className="w-7 h-7 rounded-lg bg-rust/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-rust" />
            </div>
            <div>
              <p className="font-display text-sm text-forest">Inadimplentes do período</p>
              <p className="text-xs text-forest-400">
                {inadimplentes.length} atendimento{inadimplentes.length !== 1 ? "s" : ""} realizados sem pagamento ·{" "}
                total{" "}
                <span className="font-semibold text-rust">
                  {fmt(inadimplentes.reduce((s, a) => s + valorInadimplente(a), 0))}
                </span>
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand/20 text-left text-xs text-forest-500 uppercase tracking-wider bg-forest/5">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Profissional</th>
                  <th className="px-5 py-3 text-right">Valor em aberto</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/20">
                {inadimplentes.map(ag => (
                  <tr key={ag.id} className="hover:bg-rust/5 transition-colors">
                    <td className="px-5 py-3 text-forest whitespace-nowrap">
                      {format(new Date(ag.data_hora_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-5 py-3 text-forest font-medium">
                      {ag.paciente?.nome_completo ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-forest-500 hidden sm:table-cell">
                      {(ag.profissional as any)?.profile?.nome_completo ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-rust">
                      {fmt(valorInadimplente(ag))}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => { setPagarInadimplenteId(ag.id); setPagarInadimplenteForma("pix"); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium transition-colors"
                        title="Registrar pagamento">
                        <CreditCard className="w-3.5 h-3.5" />
                        Receber
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sand/30 bg-rust/5">
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-forest">Total inadimplente</td>
                  <td className="px-5 py-3 text-right font-bold text-rust">
                    {fmt(inadimplentes.reduce((s, a) => s + valorInadimplente(a), 0))}
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
                              <span className="text-green-700 font-medium">
                                {FORMA_LABELS[ag.forma_pagamento ?? ""] ?? ag.forma_pagamento ?? "Pago"}
                              </span>
                            ) : (
                              <span className="text-amber-600">Pendente</span>
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

      {/* ── Modal: marcar lançamento como pago ── */}
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

      {/* ── Modal: registrar pagamento de sessão inadimplente ── */}
      {pagarInadimplenteId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setPagarInadimplenteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h3 className="font-display text-base text-forest">Registrar pagamento</h3>
                  <p className="text-xs text-forest-500">Sessão realizada sem pagamento</p>
                </div>
              </div>
              <div>
                <label className="label">Forma de pagamento</label>
                <select value={pagarInadimplenteForma} onChange={e => setPagarInadimplenteForma(e.target.value)} className="input-field">
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
                  startTransition(async () => {
                    await registrarPagamentoInadimplente(pagarInadimplenteId!, pagarInadimplenteForma);
                    setPagarInadimplenteId(null);
                  });
                }} disabled={isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar pagamento
                </button>
                <button onClick={() => setPagarInadimplenteId(null)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: excluir lançamento ── */}
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
