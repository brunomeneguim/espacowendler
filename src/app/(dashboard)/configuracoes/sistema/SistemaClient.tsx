"use client";

import { useState, useTransition } from "react";
import { Database, Trash2, Sparkles, AlertTriangle, CheckCircle2, XCircle, Loader2, Users, Calendar, ClipboardList, StickyNote, LayoutList } from "lucide-react";
import { limparBancoDados, popularBancoDados } from "./actions";

type Op = "limpar" | "popular" | null;

export function SistemaClient() {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Op>(null);
  const [result, setResult] = useState<{ op: Op; ok: boolean; message: string; stats?: Record<string, number> } | null>(null);

  function run(op: Op) {
    setResult(null);
    startTransition(async () => {
      const fn = op === "limpar" ? limparBancoDados : popularBancoDados;
      const res = await fn();
      setResult({
        op,
        ok: !res.error,
        message: res.error ?? res.message ?? "Concluído.",
        stats: (res as any).stats,
      });
      setConfirm(null);
    });
  }

  const statIcons: Record<string, React.ReactNode> = {
    profissionais: <Users className="w-4 h-4" />,
    pacientes:     <Users className="w-4 h-4" />,
    agendamentos:  <Calendar className="w-4 h-4" />,
    tarefas:       <ClipboardList className="w-4 h-4" />,
    postits:       <StickyNote className="w-4 h-4" />,
    planners:      <LayoutList className="w-4 h-4" />,
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-forest/40 uppercase tracking-wider mb-1">Configurações</p>
        <h1 className="text-2xl font-display font-semibold text-forest">Sistema</h1>
        <p className="text-sm text-forest/60 mt-1">
          Ferramentas para manutenção e demonstração do sistema.
        </p>
      </div>

      {/* Feedback global */}
      {result && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-xl p-4 border ${
            result.ok
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {result.ok
            ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
            : <XCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />}
          <div className="min-w-0">
            <p className="text-sm font-medium">{result.message}</p>
            {result.ok && result.stats && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(result.stats)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 text-xs bg-white/60 border border-green-300 rounded-full px-2.5 py-1 text-green-700"
                    >
                      {statIcons[k]}
                      <strong>{v}</strong> {k}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card — Banco de Dados */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-forest/8 flex items-center justify-center">
            <Database className="w-5 h-5 text-forest" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-forest">Banco de Dados</h2>
            <p className="text-xs text-forest/50">Gerenciamento de dados de teste</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Popular */}
          <div className="rounded-xl border border-sand/40 bg-sand/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-forest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-peach shrink-0" />
                  Popular com dados de teste
                </p>
                <p className="text-xs text-forest/55 mt-1 leading-relaxed">
                  Cria 3 profissionais, 12 pacientes e cerca de 80 agendamentos com
                  diferentes status (realizados, pagos, faltou, cancelados, futuros),
                  além de tarefas, post-its e um planner.
                </p>
                <p className="text-xs text-forest/40 mt-1.5">
                  Senha dos profissionais de teste: <code className="bg-sand/40 px-1.5 py-0.5 rounded text-forest/60">Demo@2024!</code>
                </p>
              </div>
              {confirm !== "popular" && (
                <button
                  onClick={() => { setConfirm("popular"); setResult(null); }}
                  disabled={isPending}
                  className="shrink-0 btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Popular
                </button>
              )}
            </div>

            {confirm === "popular" && (
              <div className="mt-4 pt-4 border-t border-sand/40">
                <p className="text-sm font-medium text-forest mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Confirmar popular banco de dados?
                </p>
                <p className="text-xs text-forest/55 mb-4">
                  Serão criados profissionais com conta de acesso real ao sistema.
                  Use apenas em ambiente de demonstração.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => run("popular")}
                    disabled={isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-cream text-sm font-medium hover:bg-forest/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isPending ? "Populando…" : "Sim, popular"}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl border border-sand text-forest/70 text-sm hover:bg-sand/30 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Limpar */}
          <div className="rounded-xl border border-rust/20 bg-rust/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-rust flex items-center gap-2">
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Limpar banco de dados
                </p>
                <p className="text-xs text-rust/70 mt-1 leading-relaxed">
                  Remove todos os pacientes, agendamentos, profissionais, tarefas,
                  post-its e planners. Mantém apenas o perfil de administrador.
                  Esta ação é irreversível.
                </p>
              </div>
              {confirm !== "limpar" && (
                <button
                  onClick={() => { setConfirm("limpar"); setResult(null); }}
                  disabled={isPending}
                  className="shrink-0 text-sm px-4 py-2 rounded-xl bg-rust text-cream hover:bg-rust/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
                </button>
              )}
            </div>

            {confirm === "limpar" && (
              <div className="mt-4 pt-4 border-t border-rust/20">
                <p className="text-sm font-semibold text-rust mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Tem certeza? Esta ação não pode ser desfeita.
                </p>
                <p className="text-xs text-rust/60 mb-4">
                  Todos os dados serão permanentemente excluídos, incluindo
                  as contas de acesso dos profissionais cadastrados.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => run("limpar")}
                    disabled={isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rust text-cream text-sm font-semibold hover:bg-rust/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {isPending ? "Limpando…" : "Sim, limpar tudo"}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl border border-rust/30 text-rust/80 text-sm hover:bg-rust/10 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aviso de segurança */}
      <p className="mt-4 text-xs text-forest/35 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        Estas funcionalidades são exclusivas para testes e demonstração. Não use em produção com dados reais.
      </p>
    </div>
  );
}
