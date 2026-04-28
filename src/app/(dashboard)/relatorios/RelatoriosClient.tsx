"use client";

import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";

interface ProfRow {
  nome: string;
  realizados: number;
  faltas: number;
  agendados: number;
  total: number;
  receitaEstimada: number;
}

interface SalaRow {
  nome: string;
  sessoes: number;
  horas: number;
}

interface MesRow {
  mes: string; // "YYYY-MM"
  label: string;
  pacientes: number;
}

interface Props {
  periodo: { inicio: string; fim: string };
  resumo: { total: number; realizados: number; faltas: number; cancelados: number; taxa: number };
  porProfissional: ProfRow[];
  pacientesPorMes: MesRow[];
  porSala: SalaRow[];
  meuResumo?: ProfRow | null;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function BarChart({ rows }: { rows: { label: string; value: number; max: number }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-forest-500 w-24 shrink-0 truncate" title={r.label}>{r.label}</span>
          <div className="flex-1 bg-sand/30 rounded-full h-5 overflow-hidden">
            <div
              className="h-full bg-forest/70 rounded-full transition-all"
              style={{ width: r.max > 0 ? `${Math.round((r.value / r.max) * 100)}%` : "0%" }}
            />
          </div>
          <span className="text-xs font-medium text-forest w-8 text-right shrink-0">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function RelatoriosClient({ periodo, resumo, porProfissional, pacientesPorMes, porSala, meuResumo }: Props) {
  const router = useRouter();

  function applyPeriod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const ini = fd.get("inicio") as string;
    const fim = fd.get("fim") as string;
    if (ini) params.set("inicio", ini);
    if (fim) params.set("fim", fim);
    router.push(`/relatorios?${params.toString()}`);
  }

  const maxSessoes = Math.max(...porProfissional.map(p => p.total), 1);
  const maxPacientes = Math.max(...pacientesPorMes.map(m => m.pacientes), 1);

  const periodoLabel = `${new Date(periodo.inicio + "T12:00:00").toLocaleDateString("pt-BR")} – ${new Date(periodo.fim + "T12:00:00").toLocaleDateString("pt-BR")}`;

  return (
    <div className="space-y-8">
      {/* Cabeçalho visível apenas na impressão */}
      <div className="hidden print:block mb-6">
        <p className="text-xl font-display font-semibold text-forest">espaço wendler</p>
        <p className="text-base font-medium mt-1">Relatório de atendimentos</p>
        <p className="text-sm text-forest-500 mt-0.5">Período: {periodoLabel}</p>
        <p className="text-xs text-forest-400 mt-0.5">
          Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <hr className="mt-4 border-forest/20" />
      </div>

      {/* Filtro de período + botão exportar */}
      <div className="print-hidden flex flex-wrap gap-3 items-end justify-between">
        <form onSubmit={applyPeriod} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">De</label>
            <input type="date" name="inicio" defaultValue={periodo.inicio} className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="label text-xs">Até</label>
            <input type="date" name="fim" defaultValue={periodo.fim} className="input-field py-1.5 text-sm" />
          </div>
          <button type="submit" className="btn-primary py-1.5 text-sm">Aplicar</button>
        </form>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary py-1.5 text-sm flex items-center gap-1.5 shrink-0"
        >
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* Resumo de atendimentos */}
      <section>
        <h2 className="font-display text-lg text-forest mb-4">Resumo de atendimentos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total agendado", value: resumo.total, color: "text-forest" },
            { label: "Realizados", value: resumo.realizados, color: "text-green-600" },
            { label: "Faltas", value: resumo.faltas, color: "text-rust" },
            { label: "Taxa de comparecimento", value: `${resumo.taxa}%`, color: resumo.taxa >= 75 ? "text-green-600" : "text-rust" },
          ].map((s, i) => (
            <div key={i} className="card p-4 text-center">
              <p className="text-xs text-forest-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-display font-medium ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Visão do próprio profissional */}
      {meuResumo && (
        <section>
          <h2 className="font-display text-lg text-forest mb-4">Seus atendimentos</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand/30 bg-forest/5 text-xs text-forest-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-right">Realizados</th>
                  <th className="px-4 py-3 text-right">Faltas</th>
                  <th className="px-4 py-3 text-right">Taxa</th>
                  <th className="px-4 py-3 text-right">Receita estimada</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{meuResumo.realizados}</td>
                  <td className="px-4 py-3 text-right text-rust">{meuResumo.faltas}</td>
                  <td className={`px-4 py-3 text-right font-medium ${meuResumo.total > 0 && Math.round((meuResumo.realizados / meuResumo.total) * 100) >= 75 ? "text-green-600" : "text-rust"}`}>
                    {meuResumo.total > 0 ? `${Math.round((meuResumo.realizados / meuResumo.total) * 100)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-forest-600">{fmt(meuResumo.receitaEstimada)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-forest-400 px-4 pb-3">
              * Receita estimada = sessões realizadas × valor de consulta cadastrado.
            </p>
          </div>
        </section>
      )}

      {/* Por profissional (apenas admin/supervisor) */}
      {!meuResumo && <section>
        <h2 className="font-display text-lg text-forest mb-4">Por profissional</h2>
        {porProfissional.length === 0 ? (
          <p className="text-sm text-forest-400">Nenhum dado para o período.</p>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sand/30 bg-forest/5 text-xs text-forest-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Profissional</th>
                    <th className="px-4 py-3 text-right">Realizados</th>
                    <th className="px-4 py-3 text-right">Faltas</th>
                    <th className="px-4 py-3 text-right">Taxa</th>
                    <th className="px-4 py-3 text-right">Receita estimada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/20">
                  {porProfissional.map((p, i) => {
                    const taxa = p.total > 0 ? Math.round((p.realizados / p.total) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-sand/10 transition-colors">
                        <td className="px-4 py-3 font-medium text-forest">{p.nome}</td>
                        <td className="px-4 py-3 text-right text-green-600">{p.realizados}</td>
                        <td className="px-4 py-3 text-right text-rust">{p.faltas}</td>
                        <td className={`px-4 py-3 text-right font-medium ${taxa >= 75 ? "text-green-600" : "text-rust"}`}>
                          {taxa}%
                        </td>
                        <td className="px-4 py-3 text-right text-forest-600">{fmt(p.receitaEstimada)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-forest-400 px-4 pb-3">
              * Receita estimada = sessões realizadas × valor de consulta cadastrado. Registre lançamentos reais no módulo Financeiro.
            </p>
          </div>
        )}
      </section>}

      {/* Pacientes novos por mês (apenas admin/supervisor) */}
      {!meuResumo && <section>
        <h2 className="font-display text-lg text-forest mb-4">Pacientes novos por mês</h2>
        {pacientesPorMes.length === 0 ? (
          <p className="text-sm text-forest-400">Nenhum paciente cadastrado no período.</p>
        ) : (
          <div className="card p-5">
            <BarChart rows={pacientesPorMes.map(m => ({ label: m.label, value: m.pacientes, max: maxPacientes }))} />
          </div>
        )}
      </section>}

      {/* Ocupação de salas (apenas admin/supervisor) */}
      {!meuResumo && <section>
        <h2 className="font-display text-lg text-forest mb-4">Ocupação de salas</h2>
        {porSala.length === 0 ? (
          <p className="text-sm text-forest-400">Nenhum agendamento com sala no período.</p>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand/30 bg-forest/5 text-xs text-forest-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Sala</th>
                  <th className="px-4 py-3 text-right">Sessões</th>
                  <th className="px-4 py-3 text-right">Horas ocupadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/20">
                {porSala.map((s, i) => (
                  <tr key={i} className="hover:bg-sand/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-forest">{s.nome}</td>
                    <td className="px-4 py-3 text-right text-forest-600">{s.sessoes}</td>
                    <td className="px-4 py-3 text-right text-forest-600">{s.horas.toFixed(1)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </div>
  );
}
