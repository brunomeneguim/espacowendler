import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { LancamentoForm } from "../LancamentoForm";

export default async function NovoLancamentoPage() {
  const profile = await getCurrentProfile();
  const isProfissional = profile.role === "profissional";

  if (!["admin", "supervisor", "secretaria", "profissional"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = createClient();

  if (isProfissional) {
    // Profissional: busca só os próprios dados
    const { data: prof } = await supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo)")
      .eq("profile_id", profile.id)
      .single();

    if (!prof) redirect("/dashboard");

    const profissionalFixed = {
      id: prof.id,
      nome: (prof as any).profile?.nome_completo ?? profile.nome_completo,
    };

    return (
      <div className="p-6 md:p-10 max-w-3xl">
        <Link href="/financeiro" className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar ao financeiro
        </Link>
        <PageHeader eyebrow="Financeiro" title="Novo lançamento" description="Registre uma receita ou despesa" />
        <LancamentoForm pacientes={[]} profissionais={[]} profissionalFixed={profissionalFixed} />
      </div>
    );
  }

  const [{ data: pacientes }, { data: profissionais }] = await Promise.all([
    supabase.from("pacientes").select("id, nome_completo").eq("ativo", true).order("nome_completo"),
    supabase.from("profissionais").select("id, profile:profiles(nome_completo)").eq("ativo", true),
  ]);

  const profsFormatted = (profissionais ?? []).map((p: any) => ({
    id: p.id,
    nome: p.profile?.nome_completo ?? "—",
  }));

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link href="/financeiro" className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar ao financeiro
      </Link>
      <PageHeader eyebrow="Financeiro" title="Novo lançamento" description="Registre uma receita ou despesa" />
      <LancamentoForm
        pacientes={(pacientes as any) ?? []}
        profissionais={profsFormatted}
      />
    </div>
  );
}
