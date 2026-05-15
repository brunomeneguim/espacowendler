"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/errorMessages";

export async function cadastrarPaciente(formData: FormData) {
  const supabase = createClient();
  const nome_completo = formData.get("nome_completo") as string;
  const telefone = formData.get("telefone") as string;
  const email = (formData.get("email") as string) || null;
  const cpf = (formData.get("cpf") as string) || null;
  const data_nascimento = (formData.get("data_nascimento") as string) || null;
  const observacoes = (formData.get("observacoes") as string) || null;

  const { error } = await supabase.from("pacientes").insert({
    nome_completo, telefone, email, cpf, data_nascimento, observacoes,
  });
  if (error) return redirect(`/pacientes/novo?error=${encodeURIComponent(friendlyError(error.message))}`);
  revalidatePath("/pacientes");
  redirect("/pacientes");
}

export async function criarPacienteCompleto(formData: FormData): Promise<{ error: string | null; id: string | null }> {
  const supabase = createClient();

  const get = (k: string) => (formData.get(k) as string) || null;

  const data_nascimento = get("data_nascimento");
  const isMinor = data_nascimento
    ? new Date().getFullYear() - new Date(data_nascimento).getFullYear() < 18
    : false;

  const respFinMesmoPaciente = formData.get("resp_fin_mesmo_paciente") === "true";

  // ── Verificação de duplicidade ────────────────────────────────────
  const nomeCompleto = (formData.get("nome_completo") as string)?.trim();
  const cpfCnpj = get("cpf_cnpj");

  // 1. CPF/CNPJ já cadastrado
  if (cpfCnpj) {
    const { data: dup } = await supabase
      .from("pacientes")
      .select("id, nome_completo")
      .eq("cpf", cpfCnpj)
      .maybeSingle();
    if (dup) return { error: `Já existe um paciente cadastrado com este CPF/CNPJ: "${dup.nome_completo}". Verifique se o paciente já está no sistema.`, id: null };
  }

  // 2. Mesmo nome + mesma data de nascimento
  if (nomeCompleto && data_nascimento) {
    const { data: dup } = await supabase
      .from("pacientes")
      .select("id, nome_completo, data_nascimento")
      .ilike("nome_completo", nomeCompleto)
      .eq("data_nascimento", data_nascimento)
      .maybeSingle();
    if (dup) return { error: `Já existe um paciente com o mesmo nome e data de nascimento: "${dup.nome_completo}". Verifique se o paciente já está no sistema.`, id: null };
  }

  // 3. Mesmo nome (sem data de nascimento para confirmar)
  if (nomeCompleto) {
    const { data: dup } = await supabase
      .from("pacientes")
      .select("id, nome_completo, data_nascimento")
      .ilike("nome_completo", nomeCompleto)
      .maybeSingle();
    if (dup) {
      const dataNascFmt = dup.data_nascimento
        ? ` (nascido em ${new Date(dup.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")})`
        : "";
      return { error: `Já existe um paciente cadastrado com o nome "${dup.nome_completo}"${dataNascFmt}. Caso seja uma pessoa diferente, verifique os dados antes de continuar.`, id: null };
    }
  }

  const { data: novo, error } = await supabase.from("pacientes").insert({
    nome_completo:                  formData.get("nome_completo") as string,
    data_cadastro:                  new Date().toISOString().split("T")[0],
    inicio_tratamento:              get("inicio_tratamento"),
    foto_url:                       get("foto_url"),
    data_nascimento,
    cpf:                            get("cpf_cnpj"),
    rg:                             get("rg"),
    sexo:                           get("sexo"),
    emite_nfse:                     formData.get("emite_nfse") === "true",
    responsavel_nome:               isMinor ? get("responsavel_nome") : null,
    responsavel_relacao:            isMinor ? get("responsavel_relacao") : null,
    responsavel_telefone:           isMinor ? get("responsavel_telefone") : null,
    responsavel_data_nascimento:    isMinor ? get("responsavel_data_nascimento") : null,
    responsavel_cpf:                isMinor ? get("responsavel_cpf") : null,
    cep:                            get("cep"),
    estado:                         get("estado"),
    cidade:                         get("cidade"),
    bairro:                         get("bairro"),
    endereco:                       get("endereco"),
    numero:                         get("numero"),
    telefone:                       get("telefone_1"),
    ddi_telefone_1:                 get("ddi_telefone_1") || "+55",
    telefone_2:                     get("telefone_2"),
    ddi_telefone_2:                 get("ddi_telefone_2") || "+55",
    email:                          get("email"),
    instagram:                      get("instagram"),
    contatos_emergencia:            JSON.parse(get("contatos_emergencia") || "[]"),
    estado_civil:                   get("estado_civil"),
    profissao:                      get("profissao"),
    grau_instrucao:                 get("grau_instrucao"),
    indicacao:                      get("indicacao"),
    observacoes:                    get("observacoes"),
    tipo_cadastro:                  get("tipo_cadastro") || "individual",
    parceiro_nome:                  get("parceiro_nome"),
    parceiro_sexo:                  get("parceiro_sexo"),
    parceiro_cpf:                   get("parceiro_cpf"),
    parceiro_data_nascimento:       get("parceiro_data_nascimento"),
    parceiro_telefone:              get("parceiro_telefone"),
    parceiro_email:                 get("parceiro_email"),
    parceiro_mesmo_endereco:        formData.get("parceiro_mesmo_endereco") !== "false",
    parceiro_cep:                   get("parceiro_cep"),
    parceiro_estado:                get("parceiro_estado"),
    parceiro_cidade:                get("parceiro_cidade"),
    parceiro_bairro:                get("parceiro_bairro"),
    parceiro_endereco:              get("parceiro_endereco"),
    parceiro_numero:                get("parceiro_numero"),
    // Responsável Financeiro
    resp_fin_mesmo_paciente:        respFinMesmoPaciente,
    resp_fin_nome:                  respFinMesmoPaciente ? null : get("resp_fin_nome"),
    resp_fin_email:                 respFinMesmoPaciente ? null : get("resp_fin_email"),
    resp_fin_cpf:                   respFinMesmoPaciente ? null : get("resp_fin_cpf"),
    resp_fin_parentesco:            respFinMesmoPaciente ? null : get("resp_fin_parentesco"),
    resp_fin_telefone:              respFinMesmoPaciente ? null : get("resp_fin_telefone"),
    resp_fin_ddi:                   respFinMesmoPaciente ? null : (get("resp_fin_ddi") || "+55"),
    resp_fin_mesmo_endereco:        formData.get("resp_fin_mesmo_endereco") === "true",
    resp_fin_cep:                   respFinMesmoPaciente ? null : get("resp_fin_cep"),
    resp_fin_estado:                respFinMesmoPaciente ? null : get("resp_fin_estado"),
    resp_fin_cidade:                respFinMesmoPaciente ? null : get("resp_fin_cidade"),
    resp_fin_bairro:                respFinMesmoPaciente ? null : get("resp_fin_bairro"),
    resp_fin_logradouro:            respFinMesmoPaciente ? null : get("resp_fin_logradouro"),
    resp_fin_numero:                respFinMesmoPaciente ? null : get("resp_fin_numero"),
    // Financeiro personalizado
    valor_consulta_especial:        (() => {
      const v = get("valor_consulta_especial");
      if (!v) return null;
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n;
    })(),
    valor_plano_especial:           (() => {
      const v = get("valor_plano_especial");
      if (!v) return null;
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n;
    })(),
    sessoes_plano_especial:         (() => {
      const v = get("sessoes_plano_especial");
      if (!v) return null;
      const n = parseInt(v);
      return isNaN(n) ? null : n;
    })(),
    ativo:                          true,
  }).select("id").single();

  if (error) return { error: friendlyError(error.message), id: null };

  // Salvar vínculos com profissionais
  const profissionalIds = formData.getAll("profissional_ids") as string[];
  if (profissionalIds.length > 0 && novo?.id) {
    const { error: vincErr } = await supabase.from("paciente_profissional").insert(
      profissionalIds.map(pid => ({ paciente_id: novo.id, profissional_id: pid }))
    );
    if (vincErr) return { error: friendlyError(vincErr.message), id: null };
  }

  revalidatePath("/pacientes");
  return { error: null, id: novo?.id ?? null };
}

export async function excluirPaciente(id: string): Promise<{ error: string | null; temConsultas: boolean; count: number }> {
  const supabase = createClient();
  const { data: consultas } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("paciente_id", id)
    .not("status", "in", "(cancelado,faltou)");
  const count = consultas?.length ?? 0;
  return { error: null, temConsultas: count > 0, count };
}

export async function excluirPacienteConfirmado(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  await supabase.from("agendamentos").delete().eq("paciente_id", id);
  const { error } = await supabase.from("pacientes").delete().eq("id", id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/pacientes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function buscarAgendamentosPaciente(
  id: string
): Promise<{ id: string; profissional: string | null; data_hora_inicio: string; status: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, status, profissional:profissionais(profile:profiles(nome_completo))")
    .eq("paciente_id", id)
    .not("status", "in", "(cancelado,faltou)")
    .order("data_hora_inicio");
  return (data ?? []).map((a: any) => ({
    id: a.id,
    profissional: a.profissional?.profile?.nome_completo ?? null,
    data_hora_inicio: a.data_hora_inicio,
    status: a.status,
  }));
}

export async function deletarAgendamento(agendamentoId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("id", agendamentoId);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deletarTodosAgendamentosPaciente(pacienteId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("paciente_id", pacienteId)
    .not("status", "in", "(cancelado,faltou)");
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function buscarProfissionaisPaciente(pacienteId: string): Promise<{ id: string; nome_completo: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("paciente_profissional")
    .select("profissional:profissionais(id, profile:profiles(nome_completo))")
    .eq("paciente_id", pacienteId);
  return (data ?? []).map((r: any) => ({
    id: r.profissional?.id ?? "",
    nome_completo: r.profissional?.profile?.nome_completo ?? "",
  })).filter(p => p.id);
}

export async function salvarProfissionaisPaciente(
  pacienteId: string,
  profissionalIds: string[]
): Promise<{ error: string | null }> {
  const supabase = createClient();
  await supabase.from("paciente_profissional").delete().eq("paciente_id", pacienteId);
  if (profissionalIds.length > 0) {
    const { error } = await supabase.from("paciente_profissional").insert(
      profissionalIds.map(pid => ({ paciente_id: pacienteId, profissional_id: pid }))
    );
    if (error) return { error: friendlyError(error.message) };
  }
  revalidatePath("/pacientes");
  return { error: null };
}

export async function toggleAtivoPaciente(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: pac } = await supabase.from("pacientes").select("ativo").eq("id", id).single();
  if (!pac) return { error: "Paciente não encontrado." };
  const { error } = await supabase.from("pacientes").update({ ativo: !pac.ativo }).eq("id", id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function salvarConfigCampos(
  configs: { campo: string; obrigatorio: boolean }[]
): Promise<{ error: string | null }> {
  const supabase = createClient();
  for (const c of configs) {
    const { error } = await supabase
      .from("configuracoes_campos_paciente")
      .upsert({ campo: c.campo, obrigatorio: c.obrigatorio });
    if (error) return { error: friendlyError(error.message) };
  }
  revalidatePath("/pacientes/novo");
  return { error: null };
}
