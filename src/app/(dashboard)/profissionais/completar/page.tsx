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
        .select("id, foto_url, data_nascimento, sexo, cpf, cnpj, telefone_1, telefone_2, horario_inicio, horario_fim, tempo_atendimento, observacoes, registro_profissional, perfil_completo, cor, valor_consulta, valor_plano")
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase.from("especialidades").select("id, nome").order("nome"),
      supabase.from("configuracoes_campos_profissional").select("campo, obrigatorio"),
      supabase.from("profissionais").select("cor").not("cor", "is", null).neq("profile_id", profile.id),
    ]);

  // Buscar especialidades atuais da junction table (multi)
  let especialidadeIds: number[] = [];
  let horariosDisponiveis: { dia_semana: number; hora_inicio: string; hora_fim: string }[] = [];
  let horariosIndisponiveis: { dia_semana: number; hora_inicio: string; hora_fim: string }[] = [];
  if ((profReg as any)?.id) {
    const [{ data: espRows }, { data: hdRows }, { data: hiRows }] = await Promise.all([
      supabase.from("profissional_especialidades").select("especialidade_id").eq("profissional_id", (profReg as any).id),
      supabase.from("horarios_disponiveis").select("dia_semana, hora_inicio, hora_fim").eq("profissional_id", (profReg as any).id),
      supabase.from("horarios_indisponiveis").select("dia_semana, hora_inicio, hora_fim").eq("profissional_id", (profReg as any).id),
    ]);
    especialidadeIds = (espRows ?? []).map((r: any) => r.especialidade_id as number);
    horariosDisponiveis = (hdRows ?? []) as typeof horariosDisponiveis;
    horariosIndisponiveis = (hiRows ?? []) as typeof horariosIndisponiveis;
  }

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
        especialidadeIds={especialidadeIds}
        horariosDisponiveis={horariosDisponiveis}
        horariosIndisponiveis={horariosIndisponiveis}
        camposConfig={camposConfig}
        coresUsadas={coresUsadas}
      />
    </div>
  );
}
