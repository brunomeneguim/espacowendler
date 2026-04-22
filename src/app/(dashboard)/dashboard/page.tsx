import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { CalendarioSemanal } from "./CalendarioSemanal";
import { ListaEncaixe } from "./ListaEncaixe";

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

  const weekEnd = addDays(weekStart, 5);
  const inicioPeriodo = format(weekStart, "yyyy-MM-dd") + "T00:00:00";
  const fimPeriodo = format(weekEnd, "yyyy-MM-dd") + "T23:59:59";

  const [
    { data: agendamentos },
    { data: profissionais },
    { data: horarios },
    { data: salas },
    { data: pacientes },
    { data: encaixes },
  ] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, data_hora_inicio, data_hora_fim, status, observacoes, paciente:pacientes(id, nome_completo, telefone), profissional:profissionais(id, profile:profiles(nome_completo)), sala:salas(id, nome)"
      )
      .gte("data_hora_inicio", inicioPeriodo)
      .lte("data_hora_inicio", fimPeriodo)
      .order("data_hora_inicio"),
    supabase
      .from("profissionais")
      .select("id, cor, profile:profiles(nome_completo)")
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
      .order("created_at"),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-full">
      <ListaEncaixe
        encaixes={(encaixes as any) ?? []}
        profissionais={(profissionais as any) ?? []}
      />
      <CalendarioSemanal
        agendamentos={(agendamentos as any) ?? []}
        profissionais={(profissionais as any) ?? []}
        horariosDisponiveis={(horarios as any) ?? []}
        salas={(salas as any) ?? []}
        pacientes={(pacientes as any) ?? []}
        weekStartStr={format(weekStart, "yyyy-MM-dd")}
        userRole={profile.role}
      />
    </div>
  );
}
