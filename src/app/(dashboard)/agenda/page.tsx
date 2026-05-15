import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Plus } from "lucide-react";
import { AgendaClient } from "./AgendaClient";

export default async function AgendaPage() {
  const profile = await getCurrentProfile();

  if (!["admin", "supervisor", "secretaria", "profissional"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = createClient();

  // Janela padrão: 7 dias atrás → 90 dias à frente
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 7);
  const fim = new Date(hoje);
  fim.setDate(hoje.getDate() + 90);

  let agendamentosQ = supabase
    .from("agendamentos")
    .select(
      "id, data_hora_inicio, data_hora_fim, status, observacoes, " +
      "paciente:pacientes(id, nome_completo, telefone), " +
      "profissional:profissionais(id, profile:profiles(nome_completo))"
    )
    .not("status", "eq", "ausencia")
    .gte("data_hora_inicio", inicio.toISOString())
    .lte("data_hora_inicio", fim.toISOString())
    .order("data_hora_inicio", { ascending: true });

  // Profissional só enxerga os próprios agendamentos
  if (profile.role === "profissional") {
    const { data: profData } = await supabase
      .from("profissionais")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    if (!profData) redirect("/dashboard");
    agendamentosQ = agendamentosQ.eq("profissional_id", profData.id);
  }

  const [{ data: agendamentosRaw }, { data: profissionaisRaw }] = await Promise.all([
    agendamentosQ,
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
  ]);

  const canEdit = ["admin", "supervisor", "secretaria"].includes(profile.role);

  const profissionais = (profissionaisRaw ?? []).map((p: any) => ({
    id: p.id,
    profile: p.profile ? { nome_completo: p.profile.nome_completo } : null,
  }));

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <PageHeader
        eyebrow="Módulo"
        title="Agenda"
        description="Atendimentos dos próximos 90 dias"
      >
        {canEdit && (
          <Link
            href="/agenda/novo"
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo agendamento
          </Link>
        )}
      </PageHeader>

      <AgendaClient
        agendamentos={(agendamentosRaw as any) ?? []}
        profissionais={profissionais}
        canEdit={canEdit}
      />
    </div>
  );
}
