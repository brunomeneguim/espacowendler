"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

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

interface Totais {
  totalSessoes: number;
  totalReceita: number;
  totalAluguel: number;
  totalLiquido: number;
}

interface Props {
  agendamentos: Agendamento[];
  periodo: { inicio: string; fim: string };
  profissional: { valor_consulta: number | null; valor_aluguel_sala: number | null };
  totais: Totais;
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

export function FinanceiroProfissionalClient({ agendamentos, periodo, profissional, totais }: Props) {
  const router = useRouter();

  function handlePeriodo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const inicio = fd.get("inicio") as string;
    const fim    = fd.get("fim") as string;
    router.push(`/financeiro?periodo_inicio=${inicio}&periodo_fim=${fim}`);
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <form onSubmit={handlePeriodo} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">De</label>
          <input type="date" name="inicio" defaultValue={periodo.inicio} className="input-field h-9 text-sm" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" name="fim" defaultValue={periodo.fim} className="input-field h-9 text-sm" />
        </div>
        <button type="submit" className="btn-primary h-9 text-sm px-4">Filtrar</button>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xs text-forest-500">Líquido</p>
          </div>
          <p className="text-xl font-display font-medium text-teal-600">{fmt(totais.totalLiquido)}</p>
        </div>
      </div>

      {/* Tabela de sessões */}
      {agendamentos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="font-display text-xl text-forest mb-1">Nenhum atendimento no período</p>
          <p className="text-sm text-forest-500">Ajuste o filtro de datas acima.</p>
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
                      <td className="px-5 py-3 text-forest">
                        {ag.paciente?.nome_completo ?? "—"}
                      </td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
