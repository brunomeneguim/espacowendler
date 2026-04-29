import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { redirect } from "next/navigation";
import { SalasClient } from "./SalasClient";

export default async function SalasPage() {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor", "secretaria", "profissional"].includes(profile.role)) redirect("/dashboard");

  const canManage = ["admin", "supervisor"].includes(profile.role);

  const supabase = createClient();
  const [{ data: salas }, { data: profissionais }] = await Promise.all([
    supabase
      .from("salas")
      .select("id, nome, ativo")
      .order("ativo", { ascending: false })
      .order("nome"),
    supabase
      .from("profissionais")
      .select("id, valor_aluguel_sala, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
  ]);

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <PageHeader
        eyebrow="Configurações"
        title="Salas de atendimento"
        description={canManage
          ? "Gerencie as salas disponíveis e o valor de aluguel por profissional"
          : "Salas de atendimento disponíveis na clínica"}
      />
      <SalasClient
        salas={(salas ?? []) as any}
        profissionais={(profissionais ?? []) as any}
        canManage={canManage}
      />
    </div>
  );
}
