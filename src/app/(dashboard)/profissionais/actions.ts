"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function cadastrarProfissional(formData: FormData) {
  const supabase = createClient();

  const profile_id = formData.get("profile_id") as string;
  const especialidade_id = (formData.get("especialidade_id") as string) || null;
  const registro_profissional = (formData.get("registro_profissional") as string) || null;
  const valorRaw = formData.get("valor_consulta") as string;
  const valor_consulta = valorRaw ? parseFloat(valorRaw) : null;

  const cor = (formData.get("cor") as string) || null;

  const { error } = await supabase.from("profissionais").insert({
    profile_id,
    especialidade_id: especialidade_id ? parseInt(especialidade_id) : null,
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

  const especialidadeId = get("especialidade_id");
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
    especialidade_id:   especialidadeId ? parseInt(especialidadeId) : null,
    data_cadastro:      new Date().toISOString().split("T")[0],
    perfil_completo:    true,
    ativo:              true,
  };

  let error;
  if (existing) {
    ({ error } = await supabase.from("profissionais").update(profData).eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("profissionais").insert({ ...profData, profile_id: user.id }));
  }

  if (error) return { error: error.message };

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

  const especialidadeId = get("especialidade_id");
  const profData = {
    profile_id,
    foto_url:              get("foto_url"),
    data_nascimento:       get("data_nascimento"),
    sexo:                  get("sexo"),
    cpf:                   get("cpf"),
    cnpj:                  get("cnpj"),
    horario_inicio:        get("horario_inicio"),
    horario_fim:           get("horario_fim"),
    tempo_atendimento:     get("tempo_atendimento") ? parseInt(get("tempo_atendimento")!) : null,
    cor:                   get("cor"),
    observacoes:           get("observacoes"),
    telefone_1:            get("telefone_1"),
    telefone_2:            get("telefone_2"),
    registro_profissional: get("registro_profissional"),
    especialidade_id:      especialidadeId ? parseInt(especialidadeId) : null,
    valor_consulta:        get("valor_consulta") ? parseFloat(get("valor_consulta")!) : null,
    data_cadastro:         new Date().toISOString().split("T")[0],
    perfil_completo:       true,
    ativo:                 true,
  };

  const { error } = await supabase.from("profissionais").insert(profData);
  if (error) return { error: error.message };

  revalidatePath("/profissionais");
  revalidatePath("/dashboard");
  redirect("/profissionais");
}
