import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { cadastrarProfissional } from "../actions";
import { ArrowLeft } from "lucide-react";

export default async function NovoProfissionalPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();

  // Busca profiles que ainda não viraram profissionais
  const [profiles, especialidades] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome_completo, email, role")
      .eq("ativo", true)
      .order("nome_completo"),
    supabase.from("especialidades").select("id, nome").order("nome"),
  ]);

  const { data: jaProfissionais } = await supabase
    .from("profissionais")
    .select("profile_id");

  const idsOcupados = new Set(
    (jaProfissionais ?? []).map((p) => p.profile_id)
  );
  const profilesDisponiveis = (profiles.data ?? []).filter(
    (p) => !idsOcupados.has(p.id)
  );

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
        description="Transforme um usuário em profissional atendente"
      />

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action={cadastrarProfissional} className="card space-y-5">
        <div>
          <label htmlFor="profile_id" className="label">
            Usuário
          </label>
          {profilesDisponiveis.length === 0 ? (
            <div className="p-4 bg-peach/10 border border-peach/30 rounded-xl text-sm text-rust">
              Todos os usuários cadastrados já estão vinculados a um
              profissional. Peça para o novo profissional criar uma conta em{" "}
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
              <option value="" disabled>
                Selecione um usuário
              </option>
              {profilesDisponiveis.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome_completo} — {p.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="especialidade_id" className="label">
            Especialidade
          </label>
          <select
            id="especialidade_id"
            name="especialidade_id"
            className="input-field"
            defaultValue=""
          >
            <option value="">— Sem especialidade —</option>
            {(especialidades.data ?? []).map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="registro_profissional" className="label">
            Registro profissional (CRP, CRM, etc.){" "}
            <span className="text-forest-400">(opcional)</span>
          </label>
          <input
            id="registro_profissional"
            name="registro_profissional"
            type="text"
            className="input-field"
            placeholder="Ex: CRP 08/12345"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="duracao_padrao_min" className="label">
              Duração padrão (min)
            </label>
            <input
              id="duracao_padrao_min"
              name="duracao_padrao_min"
              type="number"
              min="15"
              step="5"
              defaultValue="50"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="valor_consulta" className="label">
              Valor consulta (R$){" "}
              <span className="text-forest-400">(opcional)</span>
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
        </div>

        <div>
          <label htmlFor="bio" className="label">
            Mini biografia <span className="text-forest-400">(opcional)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            className="input-field resize-none"
            placeholder="Uma breve apresentação sobre o profissional"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={profilesDisponiveis.length === 0}
            className="btn-primary flex-1"
          >
            Cadastrar
          </button>
          <Link href="/profissionais" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
