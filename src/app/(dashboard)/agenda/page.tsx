import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Plus, Calendar, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_BADGE: Record<string, string> = {
  confirmado: "bg-forest text-cream",
  realizado:  "bg-teal-600 text-white",
  cancelado:  "bg-rust/10 text-rust",
  faltou:     "bg-orange-100 text-orange-700",
  agendado:   "bg-peach/30 text-rust",
};

const STATUS_LABEL: Record<string, string> = {
  agendado:   "Agendado",
  confirmado: "Confirmado",
  realizado:  "Realizado",
  cancelado:  "Cancelado",
  faltou:     "Faltou",
};

export default async function AgendaPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const canEdit = ["admin", "supervisor", "secretaria"].includes(profile.role);

  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select(
      "id, data_hora_inicio, data_hora_fim, status, observacoes, paciente:pacientes(nome_completo, telefone), profissional:profissionais(profile:profiles(nome_completo))"
    )
    .order("data_hora_inicio", { ascending: true });

  const grupos: Record<string, any[]> = {};
  (agendamentos ?? []).forEach((a: any) => {
    const key = format(new Date(a.data_hora_inicio), "yyyy-MM-dd");
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(a);
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <PageHeader
        eyebrow="Atendimentos"
        title="Agenda"
        description="Todos os agendamentos da clínica"
      >
        {canEdit && (
          <Link href="/agenda/novo" className="btn-primary">
            <Plus className="w-4 h-4" />
            Novo agendamento
          </Link>
        )}
      </PageHeader>

      {Object.keys(grupos).length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
          <h3 className="font-display text-2xl text-forest mb-2">Agenda vazia</h3>
          <p className="text-forest-600 mb-6">Comece criando seu primeiro agendamento.</p>
          {canEdit && (
            <Link href="/agenda/novo" className="btn-primary">
              <Plus className="w-4 h-4" />
              Criar agendamento
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grupos).map(([data, itens]) => (
            <section key={data}>
              <h2 className="font-display text-xl text-forest mb-3">
                {format(new Date(data + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <div className="card p-0 overflow-hidden">
                <ul className="divide-y divide-sand/20">
                  {itens.map((a: any) => (
                    <li key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream/40 transition-colors">
                      <div className="w-16 text-center shrink-0">
                        <p className="font-display text-xl text-forest">
                          {format(new Date(a.data_hora_inicio), "HH:mm")}
                        </p>
                        <p className="font-mono text-xs text-forest-500">
                          {format(new Date(a.data_hora_fim), "HH:mm")}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-forest truncate">
                          {a.paciente?.nome_completo ?? "—"}
                        </p>
                        <p className="text-sm text-forest-600 truncate">
                          com {a.profissional?.profile?.nome_completo ?? "—"}
                          {a.paciente?.telefone && <> · {a.paciente.telefone}</>}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE[a.status] ?? STATUS_BADGE.agendado}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                      {canEdit && (
                        <Link
                          href={`/agenda/${a.id}/editar`}
                          className="shrink-0 p-2 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors"
                          title="Editar agendamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
