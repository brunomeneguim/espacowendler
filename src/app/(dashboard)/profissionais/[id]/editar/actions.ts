"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function editarProfissional(profissionalId: string, profileId: string, formData: FormData) {
  const supabase = createClient();

  const nome_completo = formData.get("nome_completo") as string;
  const especialidade_id = formData.get("especialidade_id") as string;
  const registro_profissional = (formData.get("registro_profissional") as string) || null;
  const valor_consulta = formData.get("valor_consulta") as string;
  const ativo = formData.get("ativo") === "true";

  const [r1, r2] = await Promise.all([
    supabase.from("profiles").update({ nome_completo }).eq("id", profileId),
    supabase.from("profissionais").update({
      especialidade_id: especialidade_id ? parseInt(especialidade_id) : null,
      registro_profissional,
      valor_consulta: valor_consulta ? parseFloat(valor_consulta) : null,
      ativo,
    }).eq("id", profissionalId),
  ]);

  if (r1.error || r2.error) {
    const msg = r1.error?.message ?? r2.error?.message ?? "Erro ao salvar";
    return redirect(`/profissionais/${profissionalId}/editar?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/profissionais");
  revalidatePath("/dashboard");
  redirect("/profissionais");
}

export async function editarProfissionalCompleto(
  profissionalId: string,
  profileId: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const get = (k: string) => (formData.get(k) as string) || null;

  const nome_completo = formData.get("nome_completo") as string;
  await supabase.from("profiles").update({ nome_completo }).eq("id", profileId);

  const profData = {
    foto_url:              get("foto_url"),
    data_nascimento:       get("data_nascimento"),
    sexo:                  get("sexo"),
    cpf:                   get("cpf"),
    cnpj:                  get("cnpj"),
    tempo_atendimento:     get("tempo_atendimento") ? parseInt(get("tempo_atendimento")!) : null,
    cor:                   get("cor"),
    observacoes:           get("observacoes"),
    registro_profissional: get("registro_profissional"),
    telefone_1:            get("telefone_1"),
    telefone_2:            get("telefone_2"),
    valor_consulta:        get("valor_consulta") ? parseFloat(get("valor_consulta")!) : null,
    valor_plano:           get("valor_plano") ? parseFloat(get("valor_plano")!) : null,
  };

  const { error } = await supabase.from("profissionais").update(profData).eq("id", profissionalId);
  if (error) return { error: error.message };

  // Atualizar especialidades na junction table
  const especialidadeIds = formData.getAll("especialidade_ids") as string[];
  await supabase.from("profissional_especialidades").delete().eq("profissional_id", profissionalId);
  if (especialidadeIds.length > 0) {
    await supabase.from("profissional_especialidades").insert(
      especialidadeIds.map(eid => ({ profissional_id: profissionalId, especialidade_id: parseInt(eid) }))
    );
  }

  // Redefinir senha se fornecida
  const novaSenha = get("nova_senha");
  if (novaSenha) {
    const admin = createAdminClient();
    const { error: senhaError } = await admin.auth.admin.updateUserById(profileId, { password: novaSenha });
    if (senhaError) return { error: `Erro ao redefinir senha: ${senhaError.message}` };
  }

  revalidatePath("/profissionais");
  revalidatePath("/dashboard");
  redirect("/profissionais");
}

export async function gerenciarHorario(
  profissionalId: string,
  action: "add" | "remove",
  formData: FormData
) {
  const supabase = createClient();

  if (action === "remove") {
    const id = formData.get("horario_id") as string;
    await supabase.from("horarios_disponiveis").delete().eq("id", id);
  } else {
    const dia_semana = parseInt(formData.get("dia_semana") as string);
    const hora_inicio = formData.get("hora_inicio") as string;
    const hora_fim = formData.get("hora_fim") as string;

    const { data: existing } = await supabase
      .from("horarios_disponiveis")
      .select("id")
      .eq("profissional_id", profissionalId)
      .eq("dia_semana", dia_semana)
      .eq("hora_inicio", hora_inicio)
      .maybeSingle();

    if (existing) {
      return redirect(
        `/profissionais/${profissionalId}/editar?error=${encodeURIComponent("Este horário já foi adicionado.")}`
      );
    }

    await supabase.from("horarios_disponiveis").insert({
      profissional_id: profissionalId,
      dia_semana,
      hora_inicio,
      hora_fim,
    });
  }

  revalidatePath(`/profissionais/${profissionalId}/editar`);
  revalidatePath("/dashboard");
}
