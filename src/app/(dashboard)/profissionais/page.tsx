import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Plus, Stethoscope, Pencil } from "lucide-react";

export default async function ProfissionaisPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const isAdmin = profile.role === "admin";

  const { data: profissionais } = await supabase
    .from("profissionais")
    .select(
      "id, registro_profissional, valor_consulta, ativo, profile:profiles(nome_completo, email), especialidade:especialidades(nome)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais"
        description="Cadastro de quem atende na clínica"
      >
        {isAdmin && (
          <Link href="/profissionais/novo" className="btn-primary">
            <Plus className="w-4 h-4" />
            Cadastrar profissional
          </Link>
        )}
      </PageHeader>

      {!profissionais || profissionais.length === 0 ? (
        <div className="card text-center py-16">
          <Stethoscope className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
          <h3 className="font-display text-2xl text-forest mb-2">
            Nenhum profissional cadastrado
          </h3>
          <p className="text-forest-600 mb-6">
            Adicione o primeiro profissional da clínica.
          </p>
          {isAdmin && (
            <Link href="/profissionais/novo" className="btn-primary">
              <Plus className="w-4 h-4" />
              Cadastrar
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profissionais.map((p: any, i) => (
            <div
              key={p.id}
              className="card hover:shadow-warm transition-shadow animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-forest text-cream flex items-center justify-center font-display text-lg">
                  {p.profile?.nome_completo?.charAt(0) ?? "?"}
                </div>
                <div className="flex items-center gap-2">
                  {!p.ativo && (
                    <span className="text-xs px-2 py-0.5 bg-rust/10 text-rust rounded-full">
                      inativo
                    </span>
                  )}
                  {isAdmin && (
                    <Link
                      href={`/profissionais/${p.id}/editar`}
                      className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors"
                      title="Editar profissional"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
              <h3 className="font-display text-xl text-forest mb-1">
                {p.profile?.nome_completo ?? "—"}
              </h3>
              {p.especialidade?.nome && (
                <p className="text-sm text-rust mb-3">{p.especialidade.nome}</p>
              )}
              {p.registro_profissional && (
                <p className="text-xs text-forest-500 mb-3">{p.registro_profissional}</p>
              )}
              <div className="flex items-center justify-between text-xs text-forest-500 pt-3 border-t border-sand/30">
                <span className="truncate">{p.profile?.email}</span>
                {p.valor_consulta && (
                  <span className="font-medium text-forest ml-2 shrink-0">
                    R$ {Number(p.valor_consulta).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
