"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, Loader2, Pencil, Check, X, RotateCcw, DoorOpen } from "lucide-react";
import { excluirLancamentoProfissional, editarLancamentoProfissional, desfazerPagamentoSessaoFinanceiro } from "./actions";

interface Agendamento {
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

interface Lancamento {
  id: string;
  tipo: string;
  valor: number;
  data_lancamento: string;
  status: string;
  descricao: string;
  categoria: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
}

interface Totais {
  totalSessoes: number;
  totalReceita: number;
  totalAluguel: number;
  totalDespesas: number;
  totalLiquido: number;
}

interface Props {
  agendamentos: Agendamento[];
  lancamentos: Lancamento[];
  periodo: { inicio: string; fim: string };
  profissional: { valor_consulta: number | null; valor_aluguel_sala: number | null };
  totais: Totais;
}

interface EditingState {
  id: string;
  descricao: string;
  valor: string;
  tipo: string;
  categoria: string;
  data_lancamento: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<string, string> = {
  realizado: "Realizado", finalizado: "Finalizado", faltou: "Falta Cobrada",
};

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão crédito", cartao_debito: "Cartão débito",
  transferencia: "Transferência", outros: "Outros",
};

const CATEGORIA_LABELS: Record<string, string> = {
  consulta: "Consulta", plano: "Plano mensal", material: "Material",
  aluguel: "Aluguel", salario: "Salário / repasse", outros: "Outros",
};

export function FinanceiroProfissionalClient({ agendamentos, lancamentos, periodo, profissional, totais }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [desfazendoId, setDesfazendoId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Auto-navigate on date change (sem botão Filtrar)
  function handleDateChange(field: "inicio" | "fim", value: string) {
    const newInicio = field === "inicio" ? value : periodo.inicio;
    const newFim    = field === "fim"    ? value : periodo.fim;
    if (newInicio && newFim) {
      router.push(`/financeiro?periodo_inicio=${newInicio}&periodo_fim=${newFim}`);
    }
  }

  function handleExcluir(id: string) {
    setDeletandoId(id);
    setErro(null);
    startTransition(async () => {
      const res = await excluirLancamentoProfissional(id);
      if (res.error) setErro(res.error);
      else router.refresh();
      setDeletandoId(null);
    });
  }

  function handleDesfazerPagamento(agId: string) {
    setDesfazendoId(agId);
    setErro(null);
    startTransition(async () => {
      const res = await desfazerPagamentoSessaoFinanceiro(agId);
      if (res.error) setErro(res.error);
      else router.refresh();
      setDesfazendoId(null);
    });
  }

  function startEditing(l: Lancamento) {
    setEditing({
      id: l.id,
      descricao: l.descricao,
      valor: String(l.valor),
      tipo: l.tipo,
      categoria: l.categoria ?? "outros",
      data_lancamento: l.data_lancamento,
    });
    setErro(null);
  }

  function handleSalvar() {
    if (!editing) return;
    setSalvandoId(editing.id);
    setErro(null);
    const fd = new FormData();
    fd.set("descricao", editing.descricao);
    fd.set("valor", editing.valor);
    fd.set("tipo", editing.tipo);
    fd.set("categoria", editing.categoria);
    fd.set("data_lancamento", editing.data_lancamento);
    startTransition(async () => {
      const res = await editarLancamentoProfissional(editing.id, fd);
      if (res.error) setErro(res.error);
      else { setEditing(null); router.refresh(); }
      setSalvandoId(null);
    });
  }

  // Derivar entradas virtuais de aluguel a partir dos agendamentos
  const aluguelVirtual = agendamentos
    .filter(ag => ag.aluguel_cobrado && (ag.aluguel_valor ?? 0) > 0)
    .map(ag => ({
      agId: ag.id,
      data: ag.data_hora_inicio,
      valor: Number(ag.aluguel_valor ?? profissional.valor_aluguel_sala ?? 50),
      paciente: ag.paciente?.nome_completo ?? "—",
    }));

  return (
    <div className="space-y-6">
      {/* Filtro de período — sem botão, auto-filtra ao mudar data */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">De</label>
          <input
            type="date"
            defaultValue={periodo.inicio}
            className="input-field h-9 text-sm"
            onChange={e => handleDateChange("inicio", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Até</label>
          <input
            type="date"
            defaultValue={periodo.fim}
            className="input-field h-9 text-sm"
            onChange={e => handleDateChange("fim", e.target.value)}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-forest" />
            </div>
            <p className="text-xs text-forest-500">Sessões</p>
          </div>
          <p className="text-2xl font-display font-medium text-forest">{totais.totalSessoes}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-forest-500">Receita bruta</p>
          </div>
          <p className="text-xl font-display font-medium text-green-600">{fmt(totais.totalReceita)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs text-forest-500">Aluguel sala</p>
          </div>
          <p className="text-xl font-display font-medium text-amber-600">− {fmt(totais.totalAluguel)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xs text-forest-500">Despesas</p>
          </div>
          <p className="text-xl font-display font-medium text-red-500">− {fmt(totais.totalDespesas)}</p>
        </div>
        <div className="card p-4 sm:col-span-1 col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xs text-forest-500">Líquido</p>
          </div>
          <p className="text-xl font-display font-medium text-teal-600">{fmt(totais.totalLiquido)}</p>
        </div>
      </div>

      {erro && (
        <div className="text-sm text-rust bg-rust/10 border border-rust/20 rounded-xl px-4 py-3">{erro}</div>
      )}

      {/* Tabela de sessões */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 bg-forest/5 border-b border-sand/30">
          <p className="font-display text-sm text-forest">Atendimentos do período</p>
        </div>
        {agendamentos.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-forest-500">Nenhum atendimento no período.</p>
          </div>
        ) : (
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
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/20">
                {agendamentos.map(ag => {
                  const valorSessao = Number(ag.valor_sessao ?? profissional.valor_consulta ?? 0);
                  const valorAluguel = ag.aluguel_cobrado ? Number(ag.aluguel_valor ?? profissional.valor_aluguel_sala ?? 50) : 0;
                  const liquido = valorSessao - valorAluguel;
                  const isFalta = ag.status === "faltou";
                  return (
                    <tr key={ag.id} className={`hover:bg-cream/40 transition-colors ${isFalta ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3 text-forest whitespace-nowrap">
                        {format(new Date(ag.data_hora_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-5 py-3 text-forest">{ag.paciente?.nome_completo ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ag.status === "faltou" ? "bg-orange-100 text-orange-700" :
                          ag.status === "finalizado" ? "bg-gray-100 text-gray-600" :
                          "bg-teal-100 text-teal-700"
                        }`}>
                          {STATUS_LABEL[ag.status] ?? ag.status}
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
                      <td className="px-5 py-3">
                        {ag.pago && (
                          <button
                            onClick={() => handleDesfazerPagamento(ag.id)}
                            disabled={desfazendoId === ag.id || isPending}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                            title="Desfazer pagamento"
                          >
                            {desfazendoId === ag.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <RotateCcw className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lançamentos manuais */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 bg-forest/5 border-b border-sand/30">
          <p className="font-display text-sm text-forest">Lançamentos e cobranças</p>
        </div>

        {lancamentos.length === 0 && aluguelVirtual.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-forest-500">Nenhum lançamento no período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand/20 text-left text-xs text-forest-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/20">

                {/* Entradas virtuais de aluguel (derivadas dos agendamentos) */}
                {aluguelVirtual.map(al => (
                  <tr key={`aluguel-${al.agId}`} className="bg-amber-50/50 hover:bg-amber-50 transition-colors">
                    <td className="px-5 py-3 text-forest whitespace-nowrap text-xs">
                      {format(new Date(al.data), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-5 py-3 text-forest">
                      <span className="flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Aluguel de sala — {al.paciente}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-forest-500 text-xs">Aluguel</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                        Despesa
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-red-500">
                      − {fmt(al.valor)}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDesfazerPagamento(al.agId)}
                        disabled={desfazendoId === al.agId || isPending}
                        className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-400 hover:text-amber-600 transition-colors disabled:opacity-40"
                        title="Desfazer pagamento desta sessão"
                      >
                        {desfazendoId === al.agId
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RotateCcw className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Lançamentos manuais */}
                {lancamentos.map(l => (
                  editing?.id === l.id ? (
                    /* Linha de edição inline */
                    <tr key={l.id} className="bg-forest/5">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={editing.data_lancamento}
                          onChange={e => setEditing(prev => prev ? { ...prev, data_lancamento: e.target.value } : null)}
                          className="input-field h-8 text-xs w-32"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editing.descricao}
                          onChange={e => setEditing(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                          className="input-field h-8 text-xs w-full"
                          placeholder="Descrição"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editing.categoria}
                          onChange={e => setEditing(prev => prev ? { ...prev, categoria: e.target.value } : null)}
                          className="input-field h-8 text-xs"
                        >
                          {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editing.tipo}
                          onChange={e => setEditing(prev => prev ? { ...prev, tipo: e.target.value } : null)}
                          className="input-field h-8 text-xs"
                        >
                          <option value="receita">Receita</option>
                          <option value="despesa">Despesa</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={editing.valor}
                          onChange={e => setEditing(prev => prev ? { ...prev, valor: e.target.value } : null)}
                          className="input-field h-8 text-xs w-24 text-right"
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleSalvar}
                            disabled={salvandoId === l.id || isPending}
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors disabled:opacity-40"
                            title="Salvar"
                          >
                            {salvandoId === l.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-3 text-forest whitespace-nowrap text-xs">
                        {format(new Date(l.data_lancamento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="px-5 py-3 text-forest">{l.descricao}</td>
                      <td className="px-5 py-3 text-forest-500 text-xs">
                        {CATEGORIA_LABELS[l.categoria ?? ""] ?? l.categoria ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          l.tipo === "receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {l.tipo === "receita" ? "Receita" : "Despesa"}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${l.tipo === "receita" ? "text-green-700" : "text-red-500"}`}>
                        {l.tipo === "despesa" ? "− " : ""}{fmt(Number(l.valor))}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(l)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-400 hover:text-forest transition-colors disabled:opacity-40"
                            title="Editar lançamento"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExcluir(l.id)}
                            disabled={deletandoId === l.id || isPending}
                            className="p-1.5 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust transition-colors disabled:opacity-40"
                            title="Excluir lançamento"
                          >
                            {deletandoId === l.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
