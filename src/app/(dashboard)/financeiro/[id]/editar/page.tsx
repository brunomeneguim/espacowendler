import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { LancamentoForm } from "../../LancamentoForm";
import { excluirLancamento } from "../../actions";

export default async function EditarLancamentoPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor", "secretaria"].includes(profile.role)) redirect("/dashboard");

  const supabase = createClient();

  const [{ data: lancamento }, { data: pacientes }, { data: profissionais }] = await Promise.all([
    supabase.from("lancamentos").select("*").eq("id", params.id).single(),
    supabase.from("pacientes").select("id, nome_completo").eq("ativo", true).order("nome_completo"),
    supabase.from("profissionais").select("id, profile:profiles(nome_completo)").eq("ativo", true),
  ]);

  if (!lancamento) notFound();

  const profsFormatted = (profissionais ?? []).map((p: any) => ({
    id: p.id,
    nome: p.profile?.nome_completo ?? "—",
  }));

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link href="/financeiro" className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar ao financeiro
      </Link>
      <PageHeader eyebrow="Editar" title="Lançamento" description="Altere os dados do lançamento" />

      <LancamentoForm
        pacientes={(pacientes as any) ?? []}
        profissionais={profsFormatted}
        lancamento={lancamento as any}
      />

      {profile.role === "admin" && (
        <div className="mt-6 p-4 border border-rust/20 rounded-xl bg-rust/5 max-w-2xl">
          <p className="text-sm font-medium text-rust mb-2">Zona de perigo</p>
          <p className="text-xs text-rust/70 mb-3">Esta ação é irreversível.</p>
          <form action={excluirLancamento.bind(null, params.id)}>
            <button type="submit"
              className="text-sm bg-rust text-cream px-4 py-2 rounded-lg hover:bg-rust/90 transition-colors">
              Excluir lançamento
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
