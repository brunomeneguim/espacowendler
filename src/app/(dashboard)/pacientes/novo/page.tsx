import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { cadastrarPaciente } from "../actions";
import { ArrowLeft } from "lucide-react";

export default function NovoPacientePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <PageHeader
        eyebrow="Cadastro"
        title="Novo paciente"
        description="Dados básicos para começar"
      />

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action={cadastrarPaciente} className="card space-y-5">
        <div>
          <label htmlFor="nome_completo" className="label">
            Nome completo
          </label>
          <input
            id="nome_completo"
            name="nome_completo"
            type="text"
            required
            className="input-field"
            placeholder="Nome da pessoa"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="telefone" className="label">
              Telefone (WhatsApp)
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              required
              className="input-field"
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
              placeholder="email@exemplo.com"
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
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label htmlFor="data_nascimento" className="label">
              Data de nascimento{" "}
              <span className="text-forest-400">(opcional)</span>
            </label>
            <input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              className="input-field"
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
            placeholder="Informações relevantes sobre o paciente"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            Cadastrar
          </button>
          <Link href="/pacientes" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
