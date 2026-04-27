import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, Trash2 } from "lucide-react";
import { editarProfissional, gerenciarHorario } from "./actions";
import { EditarPerfilProfissionalForm } from "./EditarPerfilProfissionalForm";

const DIAS_SEMANA = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export default async function EditarProfissionalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(profile.role)) redirect("/profissionais");

  const supabase = createClient();

  const [{ data: prof }, { data: especialidades }, { data: horarios }, { data: todasCores }] = await Promise.all([
    supabase
      .from("profissionais")
      .select(
        "id, profile_id, especialidade_id, registro_profissional, valor_consulta, valor_plano, ativo, cor, foto_url, data_nascimento, sexo, cpf, cnpj, tempo_atendimento, observacoes, telefone_1, telefone_2, profile:profiles(id, nome_completo, email)"
      )
      .eq("id", params.id)
      .single(),
    supabase.from("especialidades").select("id, nome").order("nome"),
    supabase
      .from("horarios_disponiveis")
      .select("id, dia_semana, hora_inicio, hora_fim")
      .eq("profissional_id", params.id)
      .order("dia_semana")
      .order("hora_inicio"),
    supabase.from("profissionais").select("cor").eq("ativo", true).neq("id", params.id),
  ]);

  if (!prof) notFound();

  const coresUsadas = (todasCores ?? []).map((p: any) => p.cor).filter(Boolean) as string[];
  const addHorarioAction = gerenciarHorario.bind(null, params.id, "add");

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link
        href="/profissionais"
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para profissionais
      </Link>

      <PageHeader
        eyebrow="Editar"
        title={(prof.profile as any)?.nome_completo ?? "Profissional"}
        description="Altere os dados do profissional"
      />

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {/* ── Formulário completo ── */}
      <EditarPerfilProfissionalForm
        profissionalId={params.id}
        profileId={(prof.profile as any)?.id ?? prof.profile_id}
        profile={{
          nome_completo: (prof.profile as any)?.nome_completo ?? "",
          email: (prof.profile as any)?.email ?? "",
        }}
        prof={prof as any}
        especialidades={especialidades ?? []}
        coresUsadas={coresUsadas}
        canChangePassword={["admin", "supervisor"].includes(profile.role)}
      />

      {/* ── Horários disponíveis ── */}
      <div className="card space-y-4 mt-6">
        <h2 className="font-display text-lg text-forest">Horários de atendimento</h2>
        <p className="text-sm text-forest-600">
          Define quando este profissional está disponível para receber agendamentos.
        </p>

        {/* Tempo de atendimento — faz parte do prof-edit-form */}
        <div className="p-4 bg-cream rounded-xl border border-sand/30">
          <label className="label">Duração padrão da sessão (minutos)</label>
          <input
            name="tempo_atendimento"
            type="number"
            min="5"
            step="5"
            form="prof-edit-form"
            className="input-field w-48"
            placeholder="60"
            defaultValue={prof.tempo_atendimento ?? 60}
          />
          <p className="text-xs text-forest-400 mt-1.5">Usado como padrão ao criar novos agendamentos.</p>
        </div>

        {(horarios ?? []).length === 0 ? (
          <p className="text-sm text-forest-400">Nenhum horário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {(horarios ?? []).map((h: any) => {
              const dia = DIAS_SEMANA.find((d) => d.value === h.dia_semana);
              const removeAction = gerenciarHorario.bind(null, params.id, "remove");
              return (
                <div key={h.id} className="flex items-center justify-between p-3 bg-cream rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-forest w-32 shrink-0">{dia?.label}</span>
                    <span className="text-sm text-forest-500">
                      {h.hora_inicio.slice(0, 5)} – {h.hora_fim.slice(0, 5)}
                    </span>
                  </div>
                  <form action={removeAction}>
                    <input type="hidden" name="horario_id" value={h.id} />
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg text-rust hover:bg-rust/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        <form action={addHorarioAction} className="border-t border-sand/30 pt-4 space-y-3">
          <p className="text-sm font-medium text-forest">Adicionar horário</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Dia da semana</label>
              <select name="dia_semana" required className="input-field">
                {DIAS_SEMANA.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Início</label>
              <input name="hora_inicio" type="time" required className="input-field" defaultValue="07:00" />
            </div>
            <div>
              <label className="label">Fim</label>
              <input name="hora_fim" type="time" required className="input-field" defaultValue="21:00" />
            </div>
          </div>
          <div className="flex justify-center">
            <button type="submit" className="btn-primary text-sm px-8">
              Adicionar horário
            </button>
          </div>
        </form>
      </div>

      {/* ── Salvar alterações (abaixo dos horários) ── */}
      <div className="mt-6">
        <button
          type="submit"
          form="prof-edit-form"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}
