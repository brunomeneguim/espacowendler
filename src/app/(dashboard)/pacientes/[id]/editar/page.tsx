import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { editarPaciente } from "./actions";
import { format } from "date-fns";

export default async function EditarPacientePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor", "secretaria"].includes(profile.role)) {
    redirect("/pacientes");
  }

  const supabase = createClient();
  const { data: pac } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!pac) notFound();

  const action = editarPaciente.bind(null, params.id);

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para pacientes
      </Link>

      <PageHeader
        eyebrow="Editar"
        title={pac.nome_completo}
        description="Altere os dados do paciente"
      />

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action={action} className="card space-y-5">
        <div>
          <label htmlFor="nome_completo" className="label">Nome completo</label>
          <input
            id="nome_completo"
            name="nome_completo"
            type="text"
            required
            className="input-field"
            defaultValue={pac.nome_completo}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="telefone" className="label">
              Telefone <span className="text-forest-400">(opcional)</span>
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              className="input-field"
              defaultValue={pac.telefone ?? ""}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label htmlFor="email" className="label">
              Email <span className="text-forest-400">(opcional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input-field"
              defaultValue={pac.email ?? ""}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cpf" className="label">
              CPF <span className="text-forest-400">(opcional)</span>
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              className="input-field"
              defaultValue={pac.cpf ?? ""}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label htmlFor="data_nascimento" className="label">
              Data de nascimento <span className="text-forest-400">(opcional)</span>
            </label>
            <input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              className="input-field"
              defaultValue={pac.data_nascimento ?? ""}
            />
          </div>
        </div>

        <div>
          <label htmlFor="observacoes" className="label">
            Observações <span className="text-forest-400">(opcional)</span>
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            className="input-field resize-none"
            defaultValue={pac.observacoes ?? ""}
          />
        </div>

        <div>
          <label htmlFor="ativo" className="label">Status</label>
          <select
            id="ativo"
            name="ativo"
            className="input-field"
            defaultValue={pac.ativo ? "true" : "false"}
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            Salvar alterações
          </button>
          <Link href="/pacientes" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
