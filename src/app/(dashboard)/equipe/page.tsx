import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { EquipeClient } from "./EquipeClient";

export default async function EquipePage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome_completo, email, role, ativo, created_at, telefone")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <PageHeader
        eyebrow="Administração"
        title="Equipe"
        description="Usuários com acesso ao sistema e seus papéis"
      />

      <EquipeClient
        profiles={(profiles as any) ?? []}
        currentUserId={profile.id}
        currentUserRole={profile.role}
      />
    </div>
  );
}
