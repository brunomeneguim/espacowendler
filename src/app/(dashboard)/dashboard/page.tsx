import { createClient } from "@/lib/supabase/server";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { CalendarioSemanal } from "./CalendarioSemanal";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { semana?: string };
}) {
  const supabase = createClient();

  // Calcula a segunda-feira da semana selecionada (ou da semana atual)
  let weekStart: Date;
  if (searchParams.semana) {
    try {
      const d = parseISO(searchParams.semana);
      weekStart = isNaN(d.getTime())
        ? startOfWeek(new Date(), { weekStartsOn: 1 })
        : d;
    } catch {
      weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    }
  } else {
    weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  }

  const weekEnd = addDays(weekStart, 5); // Sábado
  const inicioPeriodo = format(weekStart, "yyyy-MM-dd") + "T00:00:00";
  const fimPeriodo = format(weekEnd, "yyyy-MM-dd") + "T23:59:59";

  const [{ data: agendamentos }, { data: profissionais }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, data_hora_inicio, data_hora_fim, status, paciente:pacientes(nome_completo), profissional:profissionais(id, profile:profiles(nome_completo))"
      )
      .gte("data_hora_inicio", inicioPeriodo)
      .lte("data_hora_inicio", fimPeriodo)
      .order("data_hora_inicio"),
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-full">
      <CalendarioSemanal
        agendamentos={(agendamentos as any) ?? []}
        profissionais={(profissionais as any) ?? []}
        weekStart={weekStart}
      />
    </div>
  );
}
