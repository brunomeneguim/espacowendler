import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { Plus, Users, Phone, Mail } from "lucide-react";

export default async function PacientesPage() {
  const supabase = createClient();

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nome_completo, email, telefone, cpf, data_nascimento")
    .order("nome_completo");

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <PageHeader
        eyebrow="Cadastro"
        title="Pacientes"
        description="Todas as pessoas atendidas pela clínica"
      >
        <Link href="/pacientes/novo" className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo paciente
        </Link>
      </PageHeader>

      {!pacientes || pacientes.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
          <h3 className="font-display text-2xl text-forest mb-2">
            Nenhum paciente cadastrado
          </h3>
          <p className="text-forest-600 mb-6">
            Cadastre o primeiro paciente para começar a agendar.
          </p>
          <Link href="/pacientes/novo" className="btn-primary">
            <Plus className="w-4 h-4" />
            Cadastrar paciente
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-sand/20">
            {pacientes.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-cream/50 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-peach/40 text-rust flex items-center justify-center font-display text-lg">
                  {p.nome_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-forest truncate">
                    {p.nome_completo}
                  </p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-forest-600">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {p.telefone}
                    </span>
                    {p.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {p.email}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
