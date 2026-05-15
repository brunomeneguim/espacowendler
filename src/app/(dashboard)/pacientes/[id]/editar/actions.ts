"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function atualizarPacienteCompleto(
  id: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const get = (k: string) => (formData.get(k) as string) || null;

  const data_nascimento = get("data_nascimento");
  const isMinor = data_nascimento
    ? new Date().getFullYear() - new Date(data_nascimento).getFullYear() < 18
    : false;

  const respFinMesmoPaciente = formData.get("resp_fin_mesmo_paciente") === "true";

  const { error } = await supabase
    .from("pacientes")
    .update({
      nome_completo:               formData.get("nome_completo") as string,
      foto_url:                    get("foto_url"),
      data_nascimento,
      inicio_tratamento:           get("inicio_tratamento"),
      cpf:                         get("cpf_cnpj"),
      rg:                          get("rg"),
      sexo:                        get("sexo"),
      emite_nfse:                  formData.get("emite_nfse") === "true",
      responsavel_nome:            isMinor ? get("responsavel_nome") : null,
      responsavel_relacao:         isMinor ? get("responsavel_relacao") : null,
      responsavel_telefone:        isMinor ? get("responsavel_telefone") : null,
      responsavel_ddi:             isMinor ? (get("responsavel_ddi") || "+55") : null,
      responsavel_data_nascimento: isMinor ? get("responsavel_data_nascimento") : null,
      responsavel_cpf:             isMinor ? get("responsavel_cpf") : null,
      cep:                         get("cep"),
      estado:                      get("estado"),
      cidade:                      get("cidade"),
      bairro:                      get("bairro"),
      endereco:                    get("endereco"),
      numero:                      get("numero"),
      telefone:                    get("telefone_1"),
      ddi_telefone_1:              get("ddi_telefone_1") || "+55",
      telefone_2:                  get("telefone_2"),
      ddi_telefone_2:              get("ddi_telefone_2") || "+55",
      email:                       get("email"),
      instagram:                   get("instagram"),
      contatos_emergencia:         JSON.parse(get("contatos_emergencia") || "[]"),
      estado_civil:                get("estado_civil"),
      profissao:                   get("profissao"),
      grau_instrucao:              get("grau_instrucao"),
      indicacao:                   get("indicacao"),
      observacoes:                 get("observacoes"),
      tipo_cadastro:               get("tipo_cadastro") || "individual",
      parceiro_nome:               get("parceiro_nome"),
      parceiro_sexo:               get("parceiro_sexo"),
      parceiro_cpf:                get("parceiro_cpf"),
      parceiro_data_nascimento:    get("parceiro_data_nascimento"),
      parceiro_telefone:           get("parceiro_telefone"),
      parceiro_ddi:                get("parceiro_ddi") || "+55",
      parceiro_email:              get("parceiro_email"),
      parceiro_mesmo_endereco:     formData.get("parceiro_mesmo_endereco") !== "false",
      parceiro_cep:                get("parceiro_cep"),
      parceiro_estado:             get("parceiro_estado"),
      parceiro_cidade:             get("parceiro_cidade"),
      parceiro_bairro:             get("parceiro_bairro"),
      parceiro_endereco:           get("parceiro_endereco"),
      parceiro_numero:             get("parceiro_numero"),
      // Responsável Financeiro
      resp_fin_mesmo_paciente:     respFinMesmoPaciente,
      resp_fin_nome:               respFinMesmoPaciente ? null : get("resp_fin_nome"),
      resp_fin_email:              respFinMesmoPaciente ? null : get("resp_fin_email"),
      resp_fin_cpf:                respFinMesmoPaciente ? null : get("resp_fin_cpf"),
      resp_fin_parentesco:         respFinMesmoPaciente ? null : get("resp_fin_parentesco"),
      resp_fin_telefone:           respFinMesmoPaciente ? null : get("resp_fin_telefone"),
      resp_fin_ddi:                respFinMesmoPaciente ? null : (get("resp_fin_ddi") || "+55"),
      resp_fin_mesmo_endereco:     formData.get("resp_fin_mesmo_endereco") === "true",
      resp_fin_cep:                respFinMesmoPaciente ? null : get("resp_fin_cep"),
      resp_fin_estado:             respFinMesmoPaciente ? null : get("resp_fin_estado"),
      resp_fin_cidade:             respFinMesmoPaciente ? null : get("resp_fin_cidade"),
      resp_fin_bairro:             respFinMesmoPaciente ? null : get("resp_fin_bairro"),
      resp_fin_logradouro:         respFinMesmoPaciente ? null : get("resp_fin_logradouro"),
      resp_fin_numero:             respFinMesmoPaciente ? null : get("resp_fin_numero"),
      // Financeiro personalizado
      valor_consulta_especial:     (() => {
        const v = get("valor_consulta_especial");
        if (!v) return null;
        const n = parseFloat(String(v).replace(",", "."));
        return isNaN(n) ? null : n;
      })(),
      valor_plano_especial:        (() => {
        const v = get("valor_plano_especial");
        if (!v) return null;
        const n = parseFloat(String(v).replace(",", "."));
        return isNaN(n) ? null : n;
      })(),
      sessoes_plano_especial:      (() => {
        const v = get("sessoes_plano_especial");
        if (!v) return null;
        const n = parseInt(v);
        return isNaN(n) ? null : n;
      })(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // ── Propagar valor especial para agendamentos futuros não pagos ──────────────
  // Calcula os valores numéricos (mesma lógica usada acima)
  const novoValorAvulsa = (() => {
    const v = get("valor_consulta_especial");
    if (!v) return null;
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  })();
  const novoValorPlano = (() => {
    const v = get("valor_plano_especial");
    if (!v) return null;
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  })();

  const agora = new Date().toISOString();

  // Agendamentos avulsos futuros não pagos → atualiza valor_sessao com avulsa
  if (novoValorAvulsa != null) {
    await supabase
      .from("agendamentos")
      .update({ valor_sessao: novoValorAvulsa })
      .eq("paciente_id", id)
      .eq("pago", false)
      .eq("tipo_agendamento", "consulta_avulsa")
      .gte("data_hora_inicio", agora);
  }

  // Agendamentos de plano futuros não pagos → atualiza valor_sessao com plano
  if (novoValorPlano != null) {
    await supabase
      .from("agendamentos")
      .update({ valor_sessao: novoValorPlano })
      .eq("paciente_id", id)
      .eq("pago", false)
      .eq("tipo_agendamento", "plano_mensal")
      .gte("data_hora_inicio", agora);
  }

  // Atualizar vínculos com profissionais
  const profissionalIds = formData.getAll("profissional_ids") as string[];
  await supabase.from("paciente_profissional").delete().eq("paciente_id", id);
  if (profissionalIds.length > 0) {
    await supabase.from("paciente_profissional").insert(
      profissionalIds.map(pid => ({ paciente_id: id, profissional_id: pid }))
    );
  }

  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  return { error: null };
}

export async function editarPaciente(id: string, formData: FormData) {
  const supabase = createClient();

  const nome_completo = formData.get("nome_completo") as string;
  const telefone = (formData.get("telefone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const cpf = (formData.get("cpf") as string) || null;
  const data_nascimento = (formData.get("data_nascimento") as string) || null;
  const observacoes = (formData.get("observacoes") as string) || null;
  const ativo = formData.get("ativo") === "true";

  const { error } = await supabase
    .from("pacientes")
    .update({ nome_completo, telefone, email, cpf, data_nascimento, observacoes, ativo })
    .eq("id", id);

  if (error) {
    return redirect(
      `/pacientes/${id}/editar?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/pacientes");
  redirect("/pacientes");
}
