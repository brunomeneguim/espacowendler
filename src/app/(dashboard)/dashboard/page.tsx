import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Calendar, Users, Stethoscope, TrendingUp } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const hoje = new Date();
  const inicioDia = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
  const fimDia = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();

  // Busca paralelizada
  const [agendamentosHoje, totalProf, totalPacientes, proximos] =
    await Promise.all([
      supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .gte("data_hora_inicio", inicioDia)
        .lte("data_hora_inicio", fimDia)
        .in("status", ["agendado", "confirmado"]),
      supabase
        .from("profissionais")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true),
      supabase.from("pacientes").select("id", { count: "exact", head: true }),
      supabase
        .from("agendamentos")
        .select(
          "id, data_hora_inicio, status, paciente:pacientes(nome_completo), profissional:profissionais(profile:profiles(nome_completo))"
        )
        .gte("data_hora_inicio", new Date().toISOString())
        .in("status", ["agendado", "confirmado"])
        .order("data_hora_inicio", { ascending: true })
        .limit(5),
    ]);

  const stats = [
    {
      label: "Atendimentos hoje",
      value: agendamentosHoje.count ?? 0,
      icon: Calendar,
      color: "bg-forest text-cream",
    },
    {
      label: "Profissionais ativos",
      value: totalProf.count ?? 0,
      icon: Stethoscope,
      color: "bg-peach text-rust",
    },
    {
      label: "Pacientes cadastrados",
      value: totalPacientes.count ?? 0,
      icon: Users,
      color: "bg-sand text-rust",
    },
    {
      label: "Seu papel",
      value:
        profile.role === "admin"
          ? "Admin"
          : profile.role === "supervisor"
          ? "Supervisor"
          : profile.role === "secretaria"
          ? "Secretaria"
          : "Profissional",
      icon: TrendingUp,
      color: "bg-olive text-cream",
      isText: true,
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <PageHeader
        eyebrow={`Olá, ${profile.nome_completo.split(" ")[0]}`}
        title="Visão geral"
        description={`Hoje é ${format(new Date(), "EEEE, d 'de' MMMM", {
          locale: ptBR,
        })}`}
      />

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <div
            key={i}
            className="card hover:shadow-warm transition-shadow animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.color}`}
            >
              <s.icon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <p className="text-xs uppercase tracking-wider text-forest-500 mb-1">
              {s.label}
            </p>
            <p
              className={`font-display text-forest ${
                s.isText ? "text-2xl" : "text-4xl"
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Próximos atendimentos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-forest">
            Próximos atendimentos
          </h2>
          <Link href="/agenda" className="btn-ghost text-sm">
            Ver agenda completa →
          </Link>
        </div>

        <div className="card p-0 overflow-hidden">
          {!proximos.data || proximos.data.length === 0 ? (
            <div className="p-10 text-center text-forest-500">
              <Calendar
                className="w-10 h-10 mx-auto mb-3 text-sand"
                strokeWidth={1}
              />
              <p>Nenhum atendimento agendado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-sand/20">
              {proximos.data.map((a: any) => (
                <li
                  key={a.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-cream/50 transition-colors"
                >
                  <div className="w-14 text-center">
                    <p className="font-mono text-xs text-forest-500">
                      {format(new Date(a.data_hora_inicio), "dd/MM")}
                    </p>
                    <p className="font-display text-lg text-forest">
                      {format(new Date(a.data_hora_inicio), "HH:mm")}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-forest truncate">
                      {a.paciente?.nome_completo ?? "—"}
                    </p>
                    <p className="text-sm text-forest-600 truncate">
                      com {a.profissional?.profile?.nome_completo ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      a.status === "confirmado"
                        ? "bg-forest/10 text-forest"
                        : "bg-peach/20 text-rust"
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
