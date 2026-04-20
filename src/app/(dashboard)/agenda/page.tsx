import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Plus } from "lucide-react";
import { AgendaClient } from "./AgendaClient";

export default async function AgendaPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const canEdit = ["admin", "supervisor", "secretaria"].includes(profile.role);

  const [{ data: agendamentos }, { data: profissionais }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, data_hora_inicio, data_hora_fim, status, observacoes, paciente:pacientes(nome_completo, telefone), profissional:profissionais(id, profile:profiles(nome_completo))"
      )
      .order("data_hora_inicio", { ascending: true }),
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
  ]);

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

      <AgendaClient
        agendamentos={(agendamentos as any) ?? []}
        profissionais={(profissionais as any) ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
