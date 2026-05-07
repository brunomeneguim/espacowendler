"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { criarLancamento, editarLancamento } from "./actions";

interface Paciente { id: string; nome_completo: string }
interface Profissional { id: string; nome: string }

interface Lancamento {
  id?: string;
  tipo?: string;
  valor?: number | null;
  data_lancamento?: string | null;
  data_vencimento?: string | null;
  status?: string;
  descricao?: string;
  forma_pagamento?: string | null;
  categoria?: string;
  paciente_id?: string | null;
  profissional_id?: string | null;
  observacoes?: string | null;
}

interface Props {
  pacientes: Paciente[];
  profissionais: Profissional[];
  lancamento?: Lancamento;
  /** Quando definido, o campo profissional fica fixo (visão do próprio profissional) */
  profissionalFixed?: { id: string; nome: string };
}

function MoneyInput({ defaultValue }: { defaultValue?: number | null }) {
  const toDisplay = (v: number | null | undefined) => {
    if (!v && v !== 0) return "";
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const [display, setDisplay] = useState(toDisplay(defaultValue));
  const [raw, setRaw] = useState(defaultValue ? String(defaultValue) : "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) { setDisplay(""); setRaw(""); return; }
    const num = parseInt(digits, 10) / 100;
    setRaw(num.toFixed(2));
    setDisplay(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  return (
    <>
      <input type="hidden" name="valor" value={raw} />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-forest-400 font-medium">R$</span>
        <input type="text" inputMode="numeric" className="input-field pl-9" placeholder="0,00"
          value={display} onChange={handleChange} required />
      </div>
    </>
  );
}

export function LancamentoForm({ pacientes, profissionais, lancamento = {}, profissionalFixed }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState(lancamento.tipo ?? "receita");
  const [status, setStatus] = useState(lancamento.status ?? "pendente");
  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      const res = lancamento.id
        ? await editarLancamento(lancamento.id, fd)
        : await criarLancamento(fd);
      if (res.error) { setErro(res.error); return; }
      router.push("/financeiro");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 max-w-2xl">
      {erro && (
        <div className="flex items-start gap-2 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {/* Tipo */}
      <div>
        <label className="label">Tipo <span className="text-rust">*</span></label>
        <div className="flex gap-1 p-1 bg-sand/20 rounded-xl w-fit">
          {(["receita", "despesa"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tipo === t ? "bg-white text-forest shadow-sm" : "text-forest-500 hover:text-forest hover:bg-white/50"}`}>
              {t === "receita" ? "📥 Receita" : "📤 Despesa"}
            </button>
          ))}
        </div>
        <input type="hidden" name="tipo" value={tipo} />
      </div>

      {/* Descrição */}
      <div>
        <label className="label">Descrição <span className="text-rust">*</span></label>
        <input name="descricao" type="text" className="input-field" required
          placeholder="Ex: Consulta avulsa, Aluguel de sala…"
          defaultValue={lancamento.descricao ?? ""} />
      </div>

      {/* Valor + Categoria */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Valor <span className="text-rust">*</span></label>
          <MoneyInput defaultValue={lancamento.valor} />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select name="categoria" className="input-field" defaultValue={lancamento.categoria ?? "outros"}>
            <option value="consulta">Consulta</option>
            <option value="plano">Plano mensal</option>
            <option value="material">Material</option>
            <option value="aluguel">Aluguel</option>
            <option value="salario">Salário / repasse</option>
            <option value="outros">Outros</option>
          </select>
        </div>
      </div>

      {/* Datas */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Data do lançamento <span className="text-rust">*</span></label>
          <input name="data_lancamento" type="date" className="input-field" required
            defaultValue={lancamento.data_lancamento ?? today} />
        </div>
        <div>
          <label className="label">Data de vencimento</label>
          <input name="data_vencimento" type="date" className="input-field"
            defaultValue={lancamento.data_vencimento ?? ""} />
        </div>
      </div>

      {/* Status + Forma de pagamento */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Status <span className="text-rust">*</span></label>
          <select name="status" className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        {status === "pago" && (
          <div>
            <label className="label">Forma de pagamento</label>
            <select name="forma_pagamento" className="input-field" defaultValue={lancamento.forma_pagamento ?? "pix"}>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_credito">Cartão de crédito</option>
              <option value="cartao_debito">Cartão de débito</option>
              <option value="transferencia">Transferência</option>
              <option value="outros">Outros</option>
            </select>
          </div>
        )}
      </div>

      {/* Paciente + Profissional */}
      {profissionalFixed ? (
        /* Visão do profissional: profissional fixo, sem seletor de paciente */
        <>
          <input type="hidden" name="profissional_id" value={profissionalFixed.id} />
          <div className="px-3 py-2 bg-forest/5 border border-forest/10 rounded-xl text-sm text-forest-600">
            Lançamento vinculado a: <span className="font-medium text-forest">{profissionalFixed.nome}</span>
          </div>
        </>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Paciente <span className="text-forest-400 text-xs font-normal">(opcional)</span></label>
            <select name="paciente_id" className="input-field" defaultValue={lancamento.paciente_id ?? ""}>
              <option value="">Sem paciente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nome_completo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Profissional <span className="text-forest-400 text-xs font-normal">(opcional)</span></label>
            <select name="profissional_id" className="input-field" defaultValue={lancamento.profissional_id ?? ""}>
              <option value="">Sem profissional</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Observações */}
      <div>
        <label className="label">Observações</label>
        <textarea name="observacoes" rows={2} className="input-field resize-none"
          placeholder="Informações adicionais…"
          defaultValue={lancamento.observacoes ?? ""} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : lancamento.id ? "Salvar alterações" : "Criar lançamento"}
        </button>
        <Link href="/financeiro" className="btn-secondary flex-1">Cancelar</Link>
      </div>
    </form>
  );
}
