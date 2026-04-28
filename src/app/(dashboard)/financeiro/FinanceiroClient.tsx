"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Clock, AlertCircle,
  Plus, Check, Pencil, Trash2, Loader2, Filter,
} from "lucide-react";
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
}

interface Props {
  lancamentos: Lancamento[];
  totaisMes: Totais;
  filtros: Filtros;
  isAdmin: boolean;
}

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão crédito", cartao_debito: "Cartão débito",
  transferencia: "Transferência", outros: "Outros",
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

export function FinanceiroClient({ lancamentos, totaisMes, filtros, isAdmin }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [pagarForma, setPagarForma] = useState("pix");
  const [excluirId, setExcluirId] = useState<string | null>(null);

  function applyFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    (["periodo_inicio", "periodo_fim", "tipo", "status"] as const).forEach(k => {
      const v = fd.get(k) as string;
      if (v) params.set(k, v);
    });
    router.push(`/financeiro?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* KPIs — do mês atual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Receita recebida (mês)" value={fmt(totaisMes.receitaPaga)}
          icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
        <KpiCard label="Pendente" value={fmt(totaisMes.pendente)}
          icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <KpiCard label="Inadimplente" value={fmt(totaisMes.inadimplente)}
          icon={AlertCircle} color="text-rust" bg="bg-rust/10" />
        <KpiCard label="Despesas (mês)" value={fmt(totaisMes.despesasMes)}
          icon={TrendingDown} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Filtros + Novo */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <form onSubmit={applyFilter} className="flex flex-wrap gap-2 flex-1">
          <div>
            <label className="label text-xs">De</label>
            <input type="date" name="periodo_inicio" defaultValue={filtros.periodo_inicio}
              className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="label text-xs">Até</label>
            <input type="date" name="periodo_fim" defaultValue={filtros.periodo_fim}
              className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="label text-xs">Tipo</label>
            <select name="tipo" defaultValue={filtros.tipo} className="input-field py-1.5 text-sm">
              <option value="">Todos</option>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Status</label>
            <select name="status" defaultValue={filtros.status} className="input-field py-1.5 text-sm">
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-secondary py-1.5 text-sm flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filtrar
            </button>
          </div>
        </form>
        <Link href="/financeiro/novo"
          className="btn-primary text-sm flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Novo lançamento
        </Link>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {lancamentos.length === 0 ? (
          <div className="p-10 text-center text-forest-400">
            <p className="text-sm">Nenhum lançamento encontrado para o período.</p>
            <Link href="/financeiro/novo" className="mt-3 inline-flex items-center gap-1.5 text-sm text-forest hover:underline">
              <Plus className="w-3.5 h-3.5" /> Criar primeiro lançamento
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

      {/* Modal — marcar como pago */}
      {pagarId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPagarId(null)} />
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
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setExcluirId(null)} />
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
