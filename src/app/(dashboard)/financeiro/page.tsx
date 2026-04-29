import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Plus } from "lucide-react";
import { FinanceiroClient } from "./FinanceiroClient";
import { FinanceiroProfissionalClient } from "./FinanceiroProfissionalClient";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { periodo_inicio?: string; periodo_fim?: string; tipo?: string; status?: string; profissional_id?: string; sala_id?: string };
}) {
  const profile = await getCurrentProfile();

  // Profissional: acesso à própria visão financeira
  if (profile.role === "profissional") {
    return FinanceiroProfissionalPage({ profile, searchParams });
  }

  // Apenas roles que não são profissional chegam aqui; todos têm acesso
  if (!["admin", "supervisor", "secretaria"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = createClient();

  // ── Período padrão: mês atual ──
  const today = new Date();
  const defaultInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const defaultFim = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const filtros = {
    periodo_inicio:  searchParams.periodo_inicio  || defaultInicio,
    periodo_fim:     searchParams.periodo_fim     || defaultFim,
    tipo:            searchParams.tipo            || "",
    status:          searchParams.status          || "",
    profissional_id: searchParams.profissional_id || "",
    sala_id:         searchParams.sala_id         || "",
  };

  let q = supabase
    .from("lancamentos")
    .select("id, tipo, valor, data_lancamento, data_vencimento, status, descricao, forma_pagamento, categoria, observacoes, paciente:pacientes(nome_completo), profissional:profissionais(profile:profiles(nome_completo))")
    .gte("data_lancamento", filtros.periodo_inicio)
    .lte("data_lancamento", filtros.periodo_fim)
    .order("data_lancamento", { ascending: false });

  if (filtros.tipo)   q = q.eq("tipo", filtros.tipo);
  if (filtros.status) q = q.eq("status", filtros.status);

  const mesInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const mesFim    = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // ── Buscar todos os dados em paralelo ──
  let agsPeriodoQ = supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, valor_sessao, forma_pagamento, aluguel_cobrado, aluguel_valor, profissional_id, profissional:profissionais(id, profile:profiles(nome_completo)), paciente:pacientes(nome_completo), sala:salas(id, nome)")
    .eq("pago", true)
    .in("status", ["realizado", "finalizado"])
    .gte("data_hora_inicio", `${filtros.periodo_inicio}T00:00:00.000Z`)
    .lte("data_hora_inicio", `${filtros.periodo_fim}T23:59:59.999Z`)
    .order("data_hora_inicio", { ascending: false });
  if (filtros.sala_id) agsPeriodoQ = agsPeriodoQ.eq("sala_id", filtros.sala_id);

  const [
    { data: lancamentos },
    { data: todosMes },
    { data: profissionaisList },
    { data: agsMesRaw },
    { data: agsPeriodoRaw },
    { data: salasList },
    { data: agsPendentesMes },
    { data: agsInadimplenteMes },
  ] = await Promise.all([
    q,
    supabase
      .from("lancamentos")
      .select("tipo, valor, status, data_vencimento")
      .gte("data_lancamento", mesInicio)
      .lte("data_lancamento", mesFim),
    supabase
      .from("profissionais")
      .select("id, valor_consulta, valor_aluguel_sala, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
    // Atendimentos pagos do mês atual (para KPI receita)
    supabase
      .from("agendamentos")
      .select("valor_sessao, profissional_id")
      .eq("pago", true)
      .in("status", ["realizado", "finalizado"])
      .gte("data_hora_inicio", `${mesInicio}T00:00:00.000Z`)
      .lte("data_hora_inicio", `${mesFim}T23:59:59.999Z`),
    // Atendimentos pagos do período filtrado (para tabela)
    agsPeriodoQ,
    // Salas (para filtro)
    supabase.from("salas").select("id, nome").eq("ativo", true).order("id"),
    // Pendentes: agendados/confirmados/realizados mas não pagos no mês
    supabase
      .from("agendamentos")
      .select("valor_sessao, profissional_id")
      .eq("pago", false)
      .in("status", ["agendado", "confirmado", "realizado"])
      .gte("data_hora_inicio", `${mesInicio}T00:00:00.000Z`)
      .lte("data_hora_inicio", `${mesFim}T23:59:59.999Z`),
    // Inadimplentes: finalizados mas não pagos no mês
    supabase
      .from("agendamentos")
      .select("valor_sessao, profissional_id")
      .eq("pago", false)
      .eq("status", "finalizado")
      .gte("data_hora_inicio", `${mesInicio}T00:00:00.000Z`)
      .lte("data_hora_inicio", `${mesFim}T23:59:59.999Z`),
  ]);

  // Mapa profissional_id → valor_consulta para fallback
  const profValorMap = new Map(
    (profissionaisList ?? []).map((p: any) => [p.id, Number(p.valor_consulta ?? 0)])
  );

  const totaisMes = (todosMes ?? []).reduce(
    (acc: { receitaPaga: number; pendente: number; inadimplente: number; despesasMes: number }, l: any) => {
      if (l.tipo === "receita" && l.status === "pago") acc.receitaPaga += Number(l.valor);
      if (l.tipo === "despesa") acc.despesasMes += Number(l.valor);
      return acc;
    },
    { receitaPaga: 0, pendente: 0, inadimplente: 0, despesasMes: 0 }
  );

  // Receita dos atendimentos pagos no mês
  const receitaAtendimentosMes = (agsMesRaw ?? []).reduce(
    (s, a: any) => s + Number(a.valor_sessao ?? profValorMap.get(a.profissional_id) ?? 0), 0
  );
  totaisMes.receitaPaga += receitaAtendimentosMes;

  // Pendente = agendados/confirmados/realizados mas não pagos (sessões agendadas sem pagamento)
  totaisMes.pendente = (agsPendentesMes ?? []).reduce(
    (s, a: any) => s + Number(a.valor_sessao ?? profValorMap.get(a.profissional_id) ?? 0), 0
  );

  // Inadimplente = finalizados mas não pagos (sessão ocorreu, não foi pago)
  totaisMes.inadimplente = (agsInadimplenteMes ?? []).reduce(
    (s, a: any) => s + Number(a.valor_sessao ?? profValorMap.get(a.profissional_id) ?? 0), 0
  );

  const agsPeriodo = (agsPeriodoRaw ?? []) as any[];

  // ── Atendimentos do profissional selecionado ──
  let profAgendamentos: any[] = [];
  let profSelecionado: any = null;
  let profTotais = { totalSessoes: 0, totalReceita: 0, totalAluguel: 0, totalLiquido: 0 };

  if (filtros.profissional_id) {
    profSelecionado = (profissionaisList ?? []).find((p: any) => p.id === filtros.profissional_id) ?? null;

    const { data: ags } = await supabase
      .from("agendamentos")
      .select("id, data_hora_inicio, status, pago, forma_pagamento, valor_sessao, aluguel_cobrado, aluguel_valor, paciente:pacientes(nome_completo)")
      .eq("profissional_id", filtros.profissional_id)
      .in("status", ["realizado", "finalizado", "faltou"])
      .gte("data_hora_inicio", `${filtros.periodo_inicio}T00:00:00.000Z`)
      .lte("data_hora_inicio", `${filtros.periodo_fim}T23:59:59.999Z`)
      .order("data_hora_inicio", { ascending: false });

    profAgendamentos = (ags ?? []) as any[];

    const valorConsulta = profSelecionado?.valor_consulta ?? null;
    const valorAluguelSala = profSelecionado?.valor_aluguel_sala ?? null;

    profTotais = {
      totalSessoes: profAgendamentos.length,
      totalReceita: profAgendamentos.reduce((s, a) => s + Number(a.valor_sessao ?? valorConsulta ?? 0), 0),
      totalAluguel: profAgendamentos.filter(a => a.aluguel_cobrado).reduce((s, a) => s + Number(a.aluguel_valor ?? valorAluguelSala ?? 50), 0),
      totalLiquido: 0,
    };
    profTotais.totalLiquido = profTotais.totalReceita - profTotais.totalAluguel;
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <PageHeader
        eyebrow="Módulo"
        title="Financeiro"
        description="Controle de receitas, despesas e inadimplência"
      >
        <Link href="/financeiro/novo" className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Novo lançamento
        </Link>
      </PageHeader>

      <FinanceiroClient
        lancamentos={(lancamentos as any) ?? []}
        totaisMes={totaisMes}
        filtros={filtros}
        isAdmin={profile.role === "admin"}
        profissionais={(profissionaisList as any) ?? []}
        salas={(salasList as any) ?? []}
        profAgendamentos={profAgendamentos}
        profSelecionado={profSelecionado}
        profTotais={profTotais}
        agendamentosPeriodo={agsPeriodo}
      />
    </div>
  );
}

// ── Visão do profissional ──────────────────────────────────────────
async function FinanceiroProfissionalPage({
  profile,
  searchParams,
}: {
  profile: { id: string; role: string; nome_completo: string };
  searchParams: { periodo_inicio?: string; periodo_fim?: string };
}) {
  const supabase = createClient();

  // Encontrar profissional_id
  const { data: profissional } = await supabase
    .from("profissionais")
    .select("id, valor_consulta, valor_aluguel_sala")
    .eq("profile_id", profile.id)
    .single();

  if (!profissional) redirect("/dashboard");

  const today = new Date();
  const defaultInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const defaultFim = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const periodo = {
    inicio: searchParams.periodo_inicio || defaultInicio,
    fim:    searchParams.periodo_fim    || defaultFim,
  };

  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, status, pago, forma_pagamento, valor_sessao, aluguel_cobrado, aluguel_valor, paciente:pacientes(nome_completo)")
    .eq("profissional_id", profissional.id)
    .in("status", ["realizado", "finalizado", "faltou"])
    .gte("data_hora_inicio", `${periodo.inicio}T00:00:00.000Z`)
    .lte("data_hora_inicio", `${periodo.fim}T23:59:59.999Z`)
    .order("data_hora_inicio", { ascending: false });

  const ags = (agendamentos ?? []) as any[];

  const totalSessoes   = ags.length;
  const totalReceita   = ags.reduce((s, a) => s + Number(a.valor_sessao ?? profissional.valor_consulta ?? 0), 0);
  const totalAluguel   = ags.filter(a => a.aluguel_cobrado).reduce((s, a) => s + Number(a.aluguel_valor ?? profissional.valor_aluguel_sala ?? 50), 0);
  const totalLiquido   = totalReceita - totalAluguel;

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <PageHeader
        eyebrow="Módulo"
        title="Financeiro"
        description="Seus atendimentos e repasses do período"
      />
      <FinanceiroProfissionalClient
        agendamentos={ags}
        periodo={periodo}
        profissional={{ valor_consulta: profissional.valor_consulta, valor_aluguel_sala: profissional.valor_aluguel_sala }}
        totais={{ totalSessoes, totalReceita, totalAluguel, totalLiquido }}
      />
    </div>
  );
}
