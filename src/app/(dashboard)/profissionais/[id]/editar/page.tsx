import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, Trash2 } from "lucide-react";
import { editarProfissional, gerenciarHorario } from "./actions";

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
  if (profile.role !== "admin") redirect("/profissionais");

  const supabase = createClient();

  const [{ data: prof }, { data: especialidades }, { data: horarios }] = await Promise.all([
    supabase
      .from("profissionais")
      .select(
        "id, profile_id, especialidade_id, registro_profissional, valor_consulta, ativo, profile:profiles(id, nome_completo, email)"
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
  ]);

  if (!prof) notFound();

  const editAction = editarProfissional.bind(null, params.id, (prof.profile as any)?.id ?? prof.profile_id);
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

      {/* ── Dados cadastrais ── */}
      <form action={editAction} className="card space-y-5 mb-6">
        <h2 className="font-display text-lg text-forest">Dados cadastrais</h2>

        <div>
          <label htmlFor="nome_completo" className="label">Nome completo</label>
          <input
            id="nome_completo"
            name="nome_completo"
            type="text"
            required
            className="input-field"
            defaultValue={(prof.profile as any)?.nome_completo ?? ""}
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            disabled
            className="input-field opacity-50 cursor-not-allowed"
            value={(prof.profile as any)?.email ?? ""}
          />
          <p className="text-xs text-forest-400 mt-1">O email não pode ser alterado aqui.</p>
        </div>

        <div>
          <label htmlFor="especialidade_id" className="label">Especialidade</label>
          <select
            id="especialidade_id"
            name="especialidade_id"
            className="input-field"
            defaultValue={prof.especialidade_id ?? ""}
          >
            <option value="">Sem especialidade</option>
            {(especialidades ?? []).map((e: any) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="registro_profissional" className="label">
            Registro profissional <span className="text-forest-400">(opcional)</span>
          </label>
          <input
            id="registro_profissional"
            name="registro_profissional"
            type="text"
            className="input-field"
            defaultValue={prof.registro_profissional ?? ""}
            placeholder="Ex: CRP 08/12345"
          />
        </div>

        <div>
          <label htmlFor="valor_consulta" className="label">
            Valor da consulta <span className="text-forest-400">(R$)</span>
          </label>
          <input
            id="valor_consulta"
            name="valor_consulta"
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            defaultValue={prof.valor_consulta ?? ""}
          />
        </div>

        <div>
          <label htmlFor="ativo" className="label">Status</label>
          <select
            id="ativo"
            name="ativo"
            className="input-field"
            defaultValue={prof.ativo ? "true" : "false"}
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            Salvar alterações
          </button>
          <Link href="/profissionais" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>

      {/* ── Horários disponíveis ── */}
      <div className="card space-y-4">
        <h2 className="font-display text-lg text-forest">Horários de atendimento</h2>
        <p className="text-sm text-forest-600">
          Define quando este profissional está disponível para receber agendamentos.
        </p>

        {/* Lista atual */}
        {(horarios ?? []).length === 0 ? (
          <p className="text-sm text-forest-400">Nenhum horário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {(horarios ?? []).map((h: any) => {
              const dia = DIAS_SEMANA.find((d) => d.value === h.dia_semana);
              const removeAction = gerenciarHorario.bind(null, params.id, "remove");
              return (
                <div key={h.id} className="flex items-center justify-between p-3 bg-cream rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-forest">{dia?.label}</span>
                    <span className="text-sm text-forest-500 ml-3">
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

        {/* Adicionar horário */}
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
              <input
                name="hora_inicio"
                type="time"
                required
                className="input-field"
                defaultValue="08:00"
              />
            </div>
            <div>
              <label className="label">Fim</label>
              <input
                name="hora_fim"
                type="time"
                required
                className="input-field"
                defaultValue="12:00"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm">
            Adicionar horário
          </button>
        </form>
      </div>
    </div>
  );
}
