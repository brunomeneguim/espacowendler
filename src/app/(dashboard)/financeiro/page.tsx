import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Plus } from "lucide-react";
import { FinanceiroClient } from "./FinanceiroClient";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { periodo_inicio?: string; periodo_fim?: string; tipo?: string; status?: string };
}) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor", "secretaria"].includes(profile.role)) redirect("/dashboard");

  const supabase = createClient();

  // ── Período padrão: mês atual ──
  const today = new Date();
  const defaultInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const defaultFim = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const filtros = {
    periodo_inicio: searchParams.periodo_inicio || defaultInicio,
    periodo_fim:    searchParams.periodo_fim    || defaultFim,
    tipo:           searchParams.tipo           || "",
    status:         searchParams.status         || "",
  };

  // ── Lançamentos filtrados ──
  let q = supabase
    .from("lancamentos")
    .select("id, tipo, valor, data_lancamento, data_vencimento, status, descricao, forma_pagamento, categoria, observacoes, paciente:pacientes(nome_completo), profissional:profissionais(profile:profiles(nome_completo))")
    .gte("data_lancamento", filtros.periodo_inicio)
    .lte("data_lancamento", filtros.periodo_fim)
    .order("data_lancamento", { ascending: false });

  if (filtros.tipo)   q = q.eq("tipo", filtros.tipo);
  if (filtros.status) q = q.eq("status", filtros.status);

  const { data: lancamentos } = await q;

  // ── KPIs do mês corrente (não filtrado) ──
  const mesInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const mesFim    = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: todosMes } = await supabase
    .from("lancamentos")
    .select("tipo, valor, status, data_vencimento")
    .gte("data_lancamento", mesInicio)
    .lte("data_lancamento", mesFim);

  const totaisMes = (todosMes ?? []).reduce(
    (acc: { receitaPaga: number; pendente: number; inadimplente: number; despesasMes: number }, l: any) => {
      if (l.tipo === "receita" && l.status === "pago") acc.receitaPaga += Number(l.valor);
      if (l.tipo === "receita" && l.status === "pendente") {
        acc.pendente += Number(l.valor);
        if (l.data_vencimento && new Date(l.data_vencimento) < today) {
          acc.inadimplente += Number(l.valor);
        }
      }
      if (l.tipo === "despesa") acc.despesasMes += Number(l.valor);
      return acc;
    },
    { receitaPaga: 0, pendente: 0, inadimplente: 0, despesasMes: 0 }
  );

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
      />
    </div>
  );
}
