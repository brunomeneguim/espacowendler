import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { format, startOfWeek, parseISO } from "date-fns";
import { DashboardContent } from "./DashboardContent";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { semana?: string };
}) {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  let weekStart: Date;
  if (searchParams.semana) {
    try {
      const d = parseISO(searchParams.semana);
      weekStart = isNaN(d.getTime())
        ? startOfWeek(new Date(), { weekStartsOn: 1 })
        : startOfWeek(d, { weekStartsOn: 1 });
    } catch {
      weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    }
  } else {
    weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  }

  // Janela de busca: semana atual ± 1 dia de buffer para timezone
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const fetchStart = new Date(weekStart);
  fetchStart.setDate(fetchStart.getDate() - 1);
  const fetchEnd = new Date(weekEnd);
  fetchEnd.setDate(fetchEnd.getDate() + 1);

  const agendamentosSelect =
    "id, data_hora_inicio, data_hora_fim, status, observacoes, tipo_agendamento, pago, forma_pagamento, valor_sessao, paciente:pacientes(id, nome_completo, telefone), profissional:profissionais(id, cor, profile:profiles(nome_completo)), sala:salas(id, nome)";

  const [
    { data: agendamentos },
    { data: profissionais },
    { data: horarios },
    { data: salas },
    { data: pacientes },
    { data: encaixes },
    { data: aniversariantesPacientes },
    { data: profissionaisComAniversario },
    { data: profPorPaciente },
  ] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(agendamentosSelect)
      .gte("data_hora_inicio", fetchStart.toISOString())
      .lt("data_hora_inicio", fetchEnd.toISOString())
      .order("data_hora_inicio", { ascending: true }),
    supabase
      .from("profissionais")
      .select("id, profile_id, cor, valor_consulta, tempo_atendimento, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
    supabase
      .from("horarios_disponiveis")
      .select("profissional_id, dia_semana, hora_inicio, hora_fim"),
    supabase
      .from("salas")
      .select("id, nome")
      .eq("ativo", true)
      .order("id"),
    supabase
      .from("pacientes")
      .select("id, nome_completo, telefone")
      .eq("ativo", true)
      .order("nome_completo"),
    supabase
      .from("lista_encaixe")
      .select("id, paciente_nome, telefone, observacoes, profissional_id, created_at, profissional:profissionais(profile:profiles(nome_completo))")
      .eq("ativo", true)
      .order("created_at", { ascending: true }),
    // Aniversariantes pacientes ativos com data_nascimento
    supabase
      .from("pacientes")
      .select("id, nome_completo, telefone, data_nascimento")
      .eq("ativo", true)
      .not("data_nascimento", "is", null),
    // Aniversariantes profissionais ativos com data_nascimento
    supabase
      .from("profissionais")
      .select("id, data_nascimento, telefone_1, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .not("data_nascimento", "is", null),
    // Último profissional por paciente (para aniversariantes)
    supabase
      .from("agendamentos")
      .select("paciente_id, profissional:profissionais(id, profile:profiles(nome_completo))")
      .not("paciente_id", "is", null)
      .order("data_hora_inicio", { ascending: false })
      .limit(2000),
  ]);

  // Para profissional: filtrar encaixe pelo próprio profissional_id
  const ownProfId = profile.role === "profissional"
    ? ((profissionais ?? []) as any[]).find((p: any) => p.profile_id === profile.id)?.id ?? null
    : null;

  const encaixesFiltrados = ownProfId
    ? (encaixes ?? []).filter((e: any) => e.profissional_id === ownProfId)
    : (encaixes ?? []);

  // Build map: paciente_id -> nome do profissional responsável (mais recente)
  const profMap = new Map<string, string>();
  for (const ag of (profPorPaciente ?? []) as any[]) {
    if (ag.paciente_id && !profMap.has(ag.paciente_id)) {
      const nome = (ag.profissional as any)?.profile?.nome_completo;
      if (nome) profMap.set(ag.paciente_id, nome);
    }
  }

  // Pacientes aniversariantes enriquecidos com nome do profissional
  const aniversariantesEnriquecidos = (aniversariantesPacientes ?? []).map((a: any) => ({
    ...a,
    tipo: "paciente" as const,
    profissional_nome: profMap.get(a.id) ?? null,
  }));

  // Profissionais aniversariantes
  const aniversariantesProfissionaisArr = (profissionaisComAniversario ?? []).map((p: any) => ({
    id: p.id,
    nome_completo: p.profile?.nome_completo ?? "—",
    telefone: p.telefone_1 ?? null,
    data_nascimento: p.data_nascimento,
    tipo: "profissional" as const,
    profissional_nome: null,
  }));

  const todosAniversariantes = [...aniversariantesEnriquecidos, ...aniversariantesProfissionaisArr];

  return (
    <div className="p-4 md:p-6 max-w-full">
      <DashboardContent
        encaixes={(encaixesFiltrados as any) ?? []}
        calProps={{
          agendamentos: (agendamentos as any) ?? [],
          profissionais: (profissionais as any) ?? [],
          horariosDisponiveis: (horarios as any) ?? [],
          salas: (salas as any) ?? [],
          pacientes: (pacientes as any) ?? [],
          aniversariantes: (todosAniversariantes as any) ?? [],
          weekStartStr: format(weekStart, "yyyy-MM-dd"),
          userRole: profile.role,
          currentUserId: profile.id,
        }}
      />
    </div>
  );
}
