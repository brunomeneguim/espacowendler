import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { NovoProfissionalForm } from "./NovoProfissionalForm";

export default async function NovoProfissionalPage() {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(profile.role)) redirect("/profissionais");

  const supabase = createClient();

  const [{ data: profiles }, { data: especialidades }, { data: jaProfissionais }, { data: coresRaw }] =
    await Promise.all([
      supabase.from("profiles").select("id, nome_completo, email").eq("ativo", true).order("nome_completo"),
      supabase.from("especialidades").select("id, nome").order("nome"),
      supabase.from("profissionais").select("profile_id"),
      supabase.from("profissionais").select("cor").not("cor", "is", null),
    ]);

  const idsOcupados = new Set((jaProfissionais ?? []).map((p) => p.profile_id));
  const profilesDisponiveis = (profiles ?? []).filter((p) => !idsOcupados.has(p.id));
  const coresUsadas = (coresRaw ?? []).map((r: any) => r.cor).filter(Boolean) as string[];

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link href="/profissionais" className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <PageHeader eyebrow="Equipe" title="Cadastrar profissional" description="Vincule um usuário do sistema como profissional atendente" />

      <NovoProfissionalForm
        profiles={profilesDisponiveis}
        initialEspecialidades={especialidades ?? []}
        coresUsadas={coresUsadas}
      />
    </div>
  );
}
