import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Plus } from "lucide-react";
import { ProfissionaisClient } from "./ProfissionaisClient";

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

      <ProfissionaisClient
        profissionais={(profissionais as any) ?? []}
        isAdmin={isAdmin}
      />
    </div>
  );
}
