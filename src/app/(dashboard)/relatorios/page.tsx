import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { RelatoriosClient } from "./RelatoriosClient";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { inicio?: string; fim?: string };
}) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(profile.role)) redirect("/dashboard");

  const supabase = createClient();

  // ── Período padrão: últimos 30 dias ──
  const hoje = new Date();
  const defaultFim  = hoje.toISOString().split("T")[0];
  const d30 = new Date(hoje); d30.setDate(d30.getDate() - 30);
  const defaultInicio = d30.toISOString().split("T")[0];

  const periodo = {
    inicio: searchParams.inicio || defaultInicio,
    fim:    searchParams.fim    || defaultFim,
  };

  // ── Buscar dados ──
  const [
    { data: agendamentos },
    { data: pacientesNovos },
  ] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(`
        id, status, data_hora_inicio, data_hora_fim,
        profissional:profissionais(id, valor_consulta, profile:profiles(nome_completo)),
        sala:salas(id, nome)
      `)
      .gte("data_hora_inicio", `${periodo.inicio}T00:00:00.000Z`)
      .lte("data_hora_inicio", `${periodo.fim}T23:59:59.999Z`)
      .not("status", "in", "(ausencia)"),
    supabase
      .from("pacientes")
      .select("id, created_at")
      .gte("created_at", `${periodo.inicio}T00:00:00.000Z`)
      .lte("created_at", `${periodo.fim}T23:59:59.999Z`),
  ]);

  const ags = (agendamentos ?? []) as any[];

  // ── Resumo geral ──
  const total       = ags.filter(a => a.status !== "cancelado").length;
  const realizados  = ags.filter(a => ["realizado", "finalizado"].includes(a.status)).length;
  const faltas      = ags.filter(a => a.status === "faltou").length;
  const taxa        = total > 0 ? Math.round((realizados / total) * 100) : 0;

  // ── Por profissional ──
  const profMap = new Map<string, {
    nome: string; realizados: number; faltas: number; agendados: number; total: number; receitaEstimada: number;
  }>();

  for (const ag of ags) {
    const prof = ag.profissional as any;
    if (!prof) continue;
    const id = prof.id;
    if (!profMap.has(id)) {
      profMap.set(id, { nome: prof.profile?.nome_completo ?? "—", realizados: 0, faltas: 0, agendados: 0, total: 0, receitaEstimada: 0 });
    }
    const row = profMap.get(id)!;
    row.total++;
    if (["realizado", "finalizado"].includes(ag.status)) {
      row.realizados++;
      row.receitaEstimada += Number(prof.valor_consulta ?? 0);
    }
    if (["faltou"].includes(ag.status)) row.faltas++;
    if (["agendado", "confirmado"].includes(ag.status)) row.agendados++;
  }

  const porProfissional = Array.from(profMap.values())
    .sort((a, b) => b.realizados - a.realizados);

  // ── Pacientes novos por mês ──
  const mesMap = new Map<string, number>();
  for (const p of (pacientesNovos ?? []) as any[]) {
    const mes = (p.created_at as string).slice(0, 7); // "YYYY-MM"
    mesMap.set(mes, (mesMap.get(mes) ?? 0) + 1);
  }

  // Garantir que todos os meses do período apareçam
  const mesStart = new Date(periodo.inicio + "T12:00:00");
  const mesEnd   = new Date(periodo.fim   + "T12:00:00");
  const mesesLabels: { mes: string; label: string; pacientes: number }[] = [];
  const cur = new Date(mesStart.getFullYear(), mesStart.getMonth(), 1);
  while (cur <= mesEnd) {
    const key   = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = cur.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    mesesLabels.push({ mes: key, label, pacientes: mesMap.get(key) ?? 0 });
    cur.setMonth(cur.getMonth() + 1);
  }

  // ── Por sala ──
  const salaMap = new Map<string, { nome: string; sessoes: number; horas: number }>();
  for (const ag of ags) {
    const sala = ag.sala as any;
    if (!sala) continue;
    const key = String(sala.id);
    if (!salaMap.has(key)) salaMap.set(key, { nome: sala.nome, sessoes: 0, horas: 0 });
    const row = salaMap.get(key)!;
    row.sessoes++;
    const ini = new Date(ag.data_hora_inicio).getTime();
    const fim = new Date(ag.data_hora_fim).getTime();
    row.horas += (fim - ini) / 3_600_000;
  }
  const porSala = Array.from(salaMap.values()).sort((a, b) => b.sessoes - a.sessoes);

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <PageHeader
        eyebrow="Análises"
        title="Relatórios"
        description="Indicadores de atendimento, faturamento e ocupação"
      />
      <RelatoriosClient
        periodo={periodo}
        resumo={{ total, realizados, faltas, cancelados: ags.filter(a => a.status === "cancelado").length, taxa }}
        porProfissional={porProfissional}
        pacientesPorMes={mesesLabels}
        porSala={porSala}
      />
    </div>
  );
}
