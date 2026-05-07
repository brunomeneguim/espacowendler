"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAccess() {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor", "secretaria"].includes(profile.role)) redirect("/dashboard");
  return profile;
}

function str(fd: FormData, k: string) { return (fd.get(k) as string | null) ?? ""; }

export async function criarLancamento(fd: FormData): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const isProfissional = profile.role === "profissional";

  if (!["admin", "supervisor", "secretaria", "profissional"].includes(profile.role)) {
    return { error: "Acesso negado." };
  }

  const supabase = createClient();

  const valor = parseFloat(str(fd, "valor"));
  if (!valor || valor <= 0) return { error: "Informe um valor válido." };

  const descricao = str(fd, "descricao");
  if (!descricao) return { error: "Informe a descrição." };

  // Para profissional: força o próprio profissional_id
  let profissional_id: string | null = str(fd, "profissional_id") || null;
  if (isProfissional) {
    const { data: prof } = await supabase
      .from("profissionais")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    profissional_id = prof?.id ?? null;
  }

  const { error } = await supabase.from("lancamentos").insert({
    tipo:            str(fd, "tipo")            || "receita",
    valor,
    data_lancamento: str(fd, "data_lancamento") || new Date().toISOString().split("T")[0],
    data_vencimento: str(fd, "data_vencimento") || null,
    status:          str(fd, "status")          || "pendente",
    descricao,
    forma_pagamento: str(fd, "forma_pagamento") || null,
    categoria:       str(fd, "categoria")       || "outros",
    paciente_id:     isProfissional ? null : (str(fd, "paciente_id") || null),
    profissional_id,
    observacoes:     str(fd, "observacoes")     || null,
    created_by:      profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { error: null };
}

export async function editarLancamentoProfissional(id: string, fd: FormData): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  // Profissional só pode editar seus próprios lançamentos
  if (profile.role === "profissional") {
    const { data: prof } = await supabase
      .from("profissionais")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (!prof) return { error: "Profissional não encontrado." };

    const { data: lanc } = await supabase
      .from("lancamentos")
      .select("profissional_id")
      .eq("id", id)
      .single();
    if (!lanc || lanc.profissional_id !== prof.id) return { error: "Sem permissão para editar este lançamento." };
  } else if (!["admin", "supervisor", "secretaria"].includes(profile.role)) {
    return { error: "Acesso negado." };
  }

  const valor = parseFloat(str(fd, "valor"));
  if (!valor || valor <= 0) return { error: "Informe um valor válido." };

  const descricao = str(fd, "descricao");
  if (!descricao) return { error: "Informe a descrição." };

  const { error } = await supabase.from("lancamentos").update({
    tipo:            str(fd, "tipo") || "receita",
    valor,
    data_lancamento: str(fd, "data_lancamento") || new Date().toISOString().split("T")[0],
    descricao,
    categoria:       str(fd, "categoria") || "outros",
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { error: null };
}

export async function desfazerPagamentoSessaoFinanceiro(agendamentoId: string): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  // Profissional só pode desfazer pagamento de suas próprias sessões
  if (profile.role === "profissional") {
    const { data: prof } = await supabase
      .from("profissionais")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (!prof) return { error: "Profissional não encontrado." };

    const { data: ag } = await supabase
      .from("agendamentos")
      .select("profissional_id, status")
      .eq("id", agendamentoId)
      .single();
    if (!ag || ag.profissional_id !== prof.id) return { error: "Sem permissão." };
  } else if (!["admin", "supervisor", "secretaria"].includes(profile.role)) {
    return { error: "Acesso negado." };
  }

  // Buscar status atual para reverter finalizado → confirmado
  const { data: agAtual } = await supabase
    .from("agendamentos")
    .select("status")
    .eq("id", agendamentoId)
    .single();

  const updateData: Record<string, unknown> = {
    pago: false,
    forma_pagamento: null,
    valor_sessao: null,
    aluguel_cobrado: false,
    aluguel_valor: null,
  };
  if (agAtual?.status === "finalizado") {
    updateData.status = "confirmado";
  }

  const { error } = await supabase
    .from("agendamentos")
    .update(updateData)
    .eq("id", agendamentoId);

  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function excluirLancamentoProfissional(id: string): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  // Profissional só pode excluir seus próprios lançamentos
  if (profile.role === "profissional") {
    const { data: prof } = await supabase
      .from("profissionais")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (!prof) return { error: "Profissional não encontrado." };

    const { data: lanc } = await supabase
      .from("lancamentos")
      .select("profissional_id")
      .eq("id", id)
      .single();
    if (!lanc || lanc.profissional_id !== prof.id) return { error: "Sem permissão para excluir este lançamento." };
  } else if (!["admin", "supervisor", "secretaria"].includes(profile.role)) {
    return { error: "Acesso negado." };
  }

  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { error: null };
}

export async function editarLancamento(id: string, fd: FormData): Promise<{ error: string | null }> {
  await requireAccess();
  const supabase = createClient();

  const valor = parseFloat(str(fd, "valor"));
  if (!valor || valor <= 0) return { error: "Informe um valor válido." };

  const { error } = await supabase.from("lancamentos").update({
    tipo:            str(fd, "tipo"),
    valor,
    data_lancamento: str(fd, "data_lancamento"),
    data_vencimento: str(fd, "data_vencimento") || null,
    status:          str(fd, "status"),
    descricao:       str(fd, "descricao"),
    forma_pagamento: str(fd, "forma_pagamento") || null,
    categoria:       str(fd, "categoria"),
    paciente_id:     str(fd, "paciente_id")     || null,
    profissional_id: str(fd, "profissional_id") || null,
    observacoes:     str(fd, "observacoes")     || null,
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { error: null };
}

export async function excluirLancamento(id: string): Promise<void> {
  await requireAccess();
  const supabase = createClient();
  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/financeiro");
  redirect("/financeiro");
}

export async function marcarComoPago(id: string, forma_pagamento: string): Promise<{ error: string | null }> {
  await requireAccess();
  const supabase = createClient();
  const { error } = await supabase.from("lancamentos").update({
    status: "pago",
    forma_pagamento: forma_pagamento || null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { error: null };
}
