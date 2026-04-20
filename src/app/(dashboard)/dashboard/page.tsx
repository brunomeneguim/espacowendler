import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock } from "lucide-react";

function gerarSlots(horaInicio: string, horaFim: string): string[] {
  const slots: string[] = [];
  const [hI, mI] = horaInicio.split(":").map(Number);
  const [hF, mF] = horaFim.split(":").map(Number);
  let h = hI,
    m = mI;
  while (h * 60 + m < hF * 60 + mF) {
    slots.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
    m += 30;
    if (m >= 60) {
      m -= 60;
      h++;
    }
  }
  return slots;
}

const STATUS_STYLE: Record<string, string> = {
  agendado: "bg-peach/30 text-rust",
  confirmado: "bg-forest/10 text-forest",
  realizado: "bg-olive/20 text-olive",
  cancelado: "bg-red-100 text-red-600",
  faltou: "bg-red-100 text-red-600",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  const hoje = format(new Date(), "yyyy-MM-dd");
  const dateStr = searchParams.date ?? hoje;

  let date: Date;
  try {
    date = parseISO(dateStr);
    if (isNaN(date.getTime())) throw new Error();
  } catch {
    date = new Date();
  }

  const diaSemana = date.getDay();
  const inicioDia = `${dateStr}T00:00:00`;
  const fimDia = `${dateStr}T23:59:59`;

  const isHoje = dateStr === hoje;
  const prevDate = format(subDays(date, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(date, 1), "yyyy-MM-dd");

  // Busca agendamentos e horários disponíveis em paralelo
  let agendamentosQuery = supabase
    .from("agendamentos")
    .select(
      "id, data_hora_inicio, data_hora_fim, status, paciente:pacientes(nome_completo, telefone), profissional:profissionais(id, profile:profiles(nome_completo))"
    )
    .gte("data_hora_inicio", inicioDia)
    .lte("data_hora_inicio", fimDia)
    .not("status", "in", '("cancelado","faltou")')
    .order("data_hora_inicio");

  // Profissional só vê a própria agenda
  if (profile.role === "profissional") {
    const { data: profData } = await supabase
      .from("profissionais")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (profData) {
      agendamentosQuery = agendamentosQuery.eq(
        "profissional_id",
        profData.id
      );
    }
  }

  const [{ data: agendamentos }, { data: horarios }] = await Promise.all([
    agendamentosQuery,
    supabase
      .from("horarios_disponiveis")
      .select(
        "hora_inicio, hora_fim, profissional:profissionais(id, profile:profiles(nome_completo))"
      )
      .eq("dia_semana", diaSemana),
  ]);

  // Monta slots livres
  const bookedSet = new Set<string>();
  for (const a of agendamentos ?? []) {
    const hora = format(new Date(a.data_hora_inicio), "HH:mm");
    bookedSet.add(`${(a.profissional as any)?.id}:${hora}`);
  }

  const slotsLivres: { hora: string; nome: string }[] = [];
  for (const h of horarios ?? []) {
    const prof = h.profissional as any;
    for (const slot of gerarSlots(h.hora_inicio, h.hora_fim)) {
      if (!bookedSet.has(`${prof?.id}:${slot}`)) {
        slotsLivres.push({
          hora: slot,
          nome: prof?.profile?.nome_completo ?? "—",
        });
      }
    }
  }
  slotsLivres.sort((a, b) => a.hora.localeCompare(b.hora));

  const temHorarios = horarios && horarios.length > 0;

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      {/* Cabeçalho com navegação de datas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-forest-500 mb-1">
            Agenda
          </p>
          <h1 className="font-display text-3xl text-forest capitalize">
            {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            {isHoje && (
              <span className="ml-3 text-sm font-sans font-normal bg-forest text-cream px-2 py-0.5 rounded-full align-middle">
                hoje
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard?date=${prevDate}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-sand/40 hover:bg-sand/20 transition-colors text-forest"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          {!isHoje && (
            <Link href="/dashboard" className="btn-ghost text-sm px-3 py-2">
              Hoje
            </Link>
          )}
          <Link
            href={`/dashboard?date=${nextDate}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-sand/40 hover:bg-sand/20 transition-colors text-forest"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/agenda/novo" className="btn-primary ml-2">
            <Plus className="w-4 h-4" />
            Novo agendamento
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna principal — agendamentos do dia */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg text-forest mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rust" strokeWidth={1.5} />
            Agendamentos
          </h2>

          {!agendamentos || agendamentos.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar
                className="w-10 h-10 mx-auto mb-3 text-sand"
                strokeWidth={1}
              />
              <p className="text-forest-600 mb-4">
                Nenhum agendamento para este dia.
              </p>
              <Link href="/agenda/novo" className="btn-primary">
                <Plus className="w-4 h-4" />
                Criar agendamento
              </Link>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <ul className="divide-y divide-sand/20">
                {agendamentos.map((a: any) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream/50 transition-colors"
                  >
                    <div className="w-14 text-center shrink-0">
                      <p className="font-display text-xl text-forest leading-tight">
                        {format(new Date(a.data_hora_inicio), "HH:mm")}
                      </p>
                      <p className="font-mono text-xs text-forest-400">
                        {format(new Date(a.data_hora_fim), "HH:mm")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-forest truncate">
                        {a.paciente?.nome_completo ?? "—"}
                      </p>
                      <p className="text-sm text-forest-500 truncate">
                        {a.profissional?.profile?.nome_completo ?? "—"}
                        {a.paciente?.telefone && (
                          <span className="text-forest-400">
                            {" · "}
                            {a.paciente.telefone}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
                        STATUS_STYLE[a.status] ?? "bg-sand/30 text-forest"
                      }`}
                    >
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Coluna lateral — horários livres */}
        <div>
          <h2 className="font-display text-lg text-forest mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rust" strokeWidth={1.5} />
            Horários disponíveis
          </h2>

          {!temHorarios ? (
            <div className="card text-center py-8 text-sm text-forest-500">
              <p>
                Configure os horários de atendimento dos profissionais para
                visualizar disponibilidade.
              </p>
            </div>
          ) : slotsLivres.length === 0 ? (
            <div className="card text-center py-8 text-sm text-forest-500">
              <p>Todos os horários estão ocupados.</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden max-h-[520px] overflow-y-auto">
              <ul className="divide-y divide-sand/20">
                {slotsLivres.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-cream/50 transition-colors"
                  >
                    <span className="font-mono text-sm text-forest font-medium w-12 shrink-0">
                      {s.hora}
                    </span>
                    <span className="text-sm text-forest-600 truncate flex-1">
                      {s.nome}
                    </span>
                    <Link
                      href={`/agenda/novo`}
                      className="text-xs text-forest hover:text-rust transition-colors shrink-0"
                    >
                      agendar →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
