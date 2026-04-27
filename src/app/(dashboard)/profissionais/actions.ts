"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function cadastrarProfissional(formData: FormData) {
  const supabase = createClient();

  const profile_id = formData.get("profile_id") as string;
  const registro_profissional = (formData.get("registro_profissional") as string) || null;
  const valorRaw = formData.get("valor_consulta") as string;
  const valor_consulta = valorRaw ? parseFloat(valorRaw) : null;
  const cor = (formData.get("cor") as string) || null;

  const { error } = await supabase.from("profissionais").insert({
    profile_id,
    registro_profissional,
    valor_consulta,
    cor,
    ativo: true,
  });

  if (error) {
    return redirect(`/profissionais/novo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profissionais");
  redirect("/profissionais");
}

// ── Especialidades ──────────────────────────────────────────────────

export async function adicionarEspecialidade(
  nome: string
): Promise<{ error: string | null; data: { id: number; nome: string } | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("especialidades")
    .insert({ nome })
    .select("id, nome")
    .single();
  if (error) return { error: error.message, data: null };
  revalidatePath("/profissionais");
  return { error: null, data: data as any };
}

export async function removerEspecialidade(
  id: number
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("especialidades").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/profissionais");
  return { error: null };
}

// ── Excluir profissional ────────────────────────────────────────────

export async function toggleAtivoProfissional(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: prof } = await supabase.from("profissionais").select("ativo").eq("id", id).single();
  if (!prof) return { error: "Profissional não encontrado." };
  const { error } = await supabase.from("profissionais").update({ ativo: !prof.ativo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/profissionais");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function alterarCorProfissional(id: string, cor: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("profissionais").update({ cor }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/profissionais");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function buscarAgendamentosProfissional(
  id: string
): Promise<{ id: string; paciente: string | null; data_hora_inicio: string; status: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, status, paciente:pacientes(nome_completo)")
    .eq("profissional_id", id)
    .not("status", "in", "(cancelado,faltou)")
    .order("data_hora_inicio");
  return (data ?? []).map((a: any) => ({
    id: a.id,
    paciente: a.paciente?.nome_completo ?? null,
    data_hora_inicio: a.data_hora_inicio,
    status: a.status,
  }));
}

export async function deletarAgendamentoProfissional(
  agendamentoId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("id", agendamentoId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deletarTodosAgendamentosProfissional(profissionalId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("profissional_id", profissionalId)
    .not("status", "in", "(cancelado,faltou)");
  if (error) return { error: error.message };
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function excluirProfissional(id: string): Promise<{ error: string | null; temConsultas: boolean; count: number }> {
  const supabase = createClient();
  const { data: consultas } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("profissional_id", id)
    .not("status", "in", "(cancelado,faltou)");
  const count = consultas?.length ?? 0;
  return { error: null, temConsultas: count > 0, count };
}

export async function excluirProfissionalConfirmado(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  await supabase.from("agendamentos").delete().eq("profissional_id", id);
  const { error } = await supabase.from("profissionais").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/profissionais");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

// ── Config campos ───────────────────────────────────────────────────

export async function salvarConfigCamposProf(
  configs: { campo: string; obrigatorio: boolean }[]
): Promise<{ error: string | null }> {
  const supabase = createClient();
  for (const c of configs) {
    const { error } = await supabase
      .from("configuracoes_campos_profissional")
      .upsert({ campo: c.campo, obrigatorio: c.obrigatorio });
    if (error) return { error: error.message };
  }
  revalidatePath("/profissionais");
  return { error: null };
}

// ── Completar perfil (primeiro acesso) ──────────────────────────────

export async function completarPerfilProfissional(
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const get = (k: string) => (formData.get(k) as string) || null;

  // Atualiza o nome no profile
  const nome_completo = formData.get("nome_completo") as string;
  await supabase.from("profiles").update({ nome_completo }).eq("id", user.id);

  // Verifica se já tem registro em profissionais
  const { data: existing } = await supabase
    .from("profissionais")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  const profData = {
    foto_url:           get("foto_url"),
    data_nascimento:    get("data_nascimento"),
    sexo:               get("sexo"),
    cpf:                get("cpf"),
    cnpj:               get("cnpj"),
    horario_inicio:     get("horario_inicio"),
    horario_fim:        get("horario_fim"),
    tempo_atendimento:  get("tempo_atendimento") ? parseInt(get("tempo_atendimento")!) : null,
    cor:                get("cor"),
    observacoes:        get("observacoes"),
    telefone_1:         get("telefone_1"),
    telefone_2:         get("telefone_2"),
    registro_profissional: get("registro_profissional"),
    data_cadastro:      new Date().toISOString().split("T")[0],
    perfil_completo:    true,
    ativo:              true,
  };

  let profId: string | undefined;
  let error;
  if (existing) {
    ({ error } = await supabase.from("profissionais").update(profData).eq("id", existing.id));
    profId = existing.id;
  } else {
    const { data: novo, error: insErr } = await supabase
      .from("profissionais")
      .insert({ ...profData, profile_id: user.id })
      .select("id")
      .single();
    error = insErr;
    profId = novo?.id;
  }

  if (error) return { error: error.message };

  // Atualizar especialidades na junction table
  const especialidadeId = get("especialidade_id");
  if (profId) {
    await supabase.from("profissional_especialidades").delete().eq("profissional_id", profId);
    if (especialidadeId) {
      await supabase.from("profissional_especialidades").insert({
        profissional_id: profId,
        especialidade_id: parseInt(especialidadeId),
      });
    }
  }

  // Alterar senha se preenchida
  const novaSenha = get("nova_senha");
  const confirmarSenha = get("confirmar_senha");
  if (novaSenha && novaSenha === confirmarSenha) {
    await supabase.auth.updateUser({ password: novaSenha });
  }

  revalidatePath("/profissionais");
  revalidatePath("/dashboard");
  return { error: null };
}

// ── Buscar dados do profissional pelo profile_id (para pre-preencher form) ──

export async function buscarDadosProfissionalPorProfile(
  profile_id: string
): Promise<{ error: string | null; data: Record<string, any> | null }> {
  const supabase = createClient();

  const { data: prof } = await supabase
    .from("profissionais")
    .select("*")
    .eq("profile_id", profile_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome_completo, email")
    .eq("id", profile_id)
    .single();

  // Buscar especialidades da junction table se o profissional já existir
  let especialidade_ids: number[] = [];
  if (prof?.id) {
    const { data: espRows } = await supabase
      .from("profissional_especialidades")
      .select("especialidade_id")
      .eq("profissional_id", prof.id);
    especialidade_ids = (espRows ?? []).map((r: any) => r.especialidade_id as number);
  }

  return {
    error: null,
    data: { ...profile, ...prof, especialidade_ids },
  };
}

// ── Cadastrar profissional completo (admin) ─────────────────────────

export async function cadastrarProfissionalCompleto(
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const get = (k: string) => (formData.get(k) as string) || null;

  const profile_id = formData.get("profile_id") as string;
  if (!profile_id) return { error: "Selecione um usuário." };

  // Atualiza nome no profile se preenchido
  const nome_completo = get("nome_completo");
  if (nome_completo) {
    await supabase.from("profiles").update({ nome_completo }).eq("id", profile_id);
  }

  const profData = {
    profile_id,
    foto_url:              get("foto_url"),
    data_nascimento:       get("data_nascimento"),
    sexo:                  get("sexo"),
    cpf:                   get("cpf"),
    cnpj:                  get("cnpj"),
    tempo_atendimento:     get("tempo_atendimento") ? parseInt(get("tempo_atendimento")!) : null,
    cor:                   get("cor"),
    observacoes:           get("observacoes"),
    telefone_1:            get("telefone_1"),
    telefone_2:            get("telefone_2"),
    registro_profissional: get("registro_profissional"),
    valor_consulta:        get("valor_consulta") ? parseFloat(get("valor_consulta")!) : null,
    valor_plano:           get("valor_plano") ? parseFloat(get("valor_plano")!) : null,
    data_cadastro:         new Date().toISOString().split("T")[0],
    perfil_completo:       true,
    ativo:                 true,
  };

  const { data: profCriado, error } = await supabase.from("profissionais").insert(profData).select("id").single();
  if (error) return { error: error.message };

  // Inserir especialidades na junction table
  const especialidadeIds = formData.getAll("especialidade_ids") as string[];
  if (especialidadeIds.length > 0 && profCriado?.id) {
    await supabase.from("profissional_especialidades").insert(
      especialidadeIds.map(eid => ({ profissional_id: profCriado.id, especialidade_id: parseInt(eid) }))
    );
  }

  // Inserir horários disponíveis, se houver
  const horariosJson = get("horarios_json");
  if (horariosJson && profCriado?.id) {
    try {
      const horarios = JSON.parse(horariosJson) as { dia_semana: number; hora_inicio: string; hora_fim: string }[];
      if (horarios.length > 0) {
        await supabase.from("horarios_disponiveis").insert(
          horarios.map(h => ({ profissional_id: profCriado.id, ...h }))
        );
      }
    } catch { /* ignora JSON inválido */ }
  }

  // Inserir horários indisponíveis, se houver
  const horariosIndispJson = get("horarios_indisponiveis_json");
  if (horariosIndispJson && profCriado?.id) {
    try {
      const horariosIndisp = JSON.parse(horariosIndispJson) as { dia_semana: number; hora_inicio: string; hora_fim: string }[];
      if (horariosIndisp.length > 0) {
        await supabase.from("horarios_indisponiveis").insert(
          horariosIndisp.map(h => ({ profissional_id: profCriado.id, ...h }))
        );
      }
    } catch { /* ignora JSON inválido */ }
  }

  revalidatePath("/profissionais");
  revalidatePath("/dashboard");
  redirect("/profissionais");
}
