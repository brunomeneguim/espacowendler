import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CompletarPerfilForm } from "./CompletarPerfilForm";

export default async function CompletarPerfilPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  const [{ data: profReg }, { data: especialidades }, { data: configsRaw }, { data: coresRaw }] =
    await Promise.all([
      supabase
        .from("profissionais")
        .select("id, foto_url, data_nascimento, sexo, cpf, cnpj, uf_conselho, cbos_codigo, cbos_nome, horario_inicio, horario_fim, tempo_atendimento, observacoes, registro_profissional, especialidade_id, perfil_completo, cor")
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase.from("especialidades").select("id, nome").order("nome"),
      supabase.from("configuracoes_campos_profissional").select("campo, obrigatorio"),
      supabase.from("profissionais").select("cor").not("cor", "is", null).neq("profile_id", profile.id),
    ]);

  const camposConfig = (configsRaw ?? []) as { campo: string; obrigatorio: boolean }[];
  const coresUsadas = (coresRaw ?? []).map((r: any) => r.cor).filter(Boolean) as string[];

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <PageHeader
        eyebrow="Bem-vindo"
        title="Complete seu perfil"
        description="Preencha seus dados profissionais para começar a usar o sistema."
      />
      <CompletarPerfilForm
        profile={profile}
        profReg={profReg as any}
        especialidades={especialidades ?? []}
        camposConfig={camposConfig}
        coresUsadas={coresUsadas}
      />
    </div>
  );
}
