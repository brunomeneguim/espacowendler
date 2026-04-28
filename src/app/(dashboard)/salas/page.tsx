import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { redirect } from "next/navigation";
import { SalasClient } from "./SalasClient";

export default async function SalasPage() {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(profile.role)) redirect("/dashboard");

  const supabase = createClient();
  const { data: salas } = await supabase
    .from("salas")
    .select("id, nome, ativo")
    .order("ativo", { ascending: false })
    .order("nome");

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <PageHeader
        eyebrow="Configurações"
        title="Salas de atendimento"
        description="Gerencie as salas disponíveis para agendamento"
      />
      <SalasClient salas={(salas ?? []) as any} />
    </div>
  );
}
