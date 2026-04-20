import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { cadastrarProfissional } from "../actions";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function NovoProfissionalPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(profile.role)) redirect("/profissionais");

  const supabase = createClient();

  const [{ data: profiles }, { data: especialidades }, { data: jaProfissionais }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome_completo, email")
        .eq("ativo", true)
        .order("nome_completo"),
      supabase.from("especialidades").select("id, nome").order("nome"),
      supabase.from("profissionais").select("profile_id"),
    ]);

  const idsOcupados = new Set((jaProfissionais ?? []).map((p) => p.profile_id));
  const profilesDisponiveis = (profiles ?? []).filter((p) => !idsOcupados.has(p.id));

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link
        href="/profissionais"
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <PageHeader
        eyebrow="Equipe"
        title="Cadastrar profissional"
        description="Vincule um usuário do sistema como profissional atendente"
      />

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action={cadastrarProfissional} className="card space-y-5">
        <div>
          <label htmlFor="profile_id" className="label">Usuário</label>
          {profilesDisponiveis.length === 0 ? (
            <div className="p-4 bg-peach/10 border border-peach/30 rounded-xl text-sm text-rust">
              Todos os usuários já estão vinculados a um profissional. Peça para
              o novo profissional criar uma conta em{" "}
              <code className="bg-white px-1.5 py-0.5 rounded">/cadastro</code>.
            </div>
          ) : (
            <select
              id="profile_id"
              name="profile_id"
              required
              className="input-field"
              defaultValue=""
            >
              <option value="" disabled>Selecione um usuário</option>
              {profilesDisponiveis.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome_completo} — {p.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="especialidade_id" className="label">Especialidade</label>
          <select id="especialidade_id" name="especialidade_id" className="input-field" defaultValue="">
            <option value="">— Sem especialidade —</option>
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
            placeholder="Ex: CRP 08/12345"
          />
        </div>

        <div>
          <label htmlFor="valor_consulta" className="label">
            Valor da consulta (R$) <span className="text-forest-400">(opcional)</span>
          </label>
          <input
            id="valor_consulta"
            name="valor_consulta"
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            placeholder="200.00"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={profilesDisponiveis.length === 0}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cadastrar profissional
          </button>
          <Link href="/profissionais" className="btn-ghost">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
