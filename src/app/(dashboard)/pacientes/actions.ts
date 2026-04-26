"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  if (error) return redirect(`/pacientes/novo?error=${encodeURIComponent(error.message)}`);
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

  const { error } = await supabase.from("pacientes").insert({
    nome_completo:                  formData.get("nome_completo") as string,
    data_cadastro:                  new Date().toISOString().split("T")[0],
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
    ativo:                          true,
  });

  if (error) return { error: error.message, id: null };

  // Buscar o id do paciente recém-criado
  const { data: novo } = await supabase.from("pacientes")
    .select("id")
    .eq("nome_completo", formData.get("nome_completo") as string)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

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
  if (error) return { error: error.message };
  revalidatePath("/pacientes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function toggleAtivoPaciente(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: pac } = await supabase.from("pacientes").select("ativo").eq("id", id).single();
  if (!pac) return { error: "Paciente não encontrado." };
  const { error } = await supabase.from("pacientes").update({ ativo: !pac.ativo }).eq("id", id);
  if (error) return { error: error.message };
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
    if (error) return { error: error.message };
  }
  revalidatePath("/pacientes/novo");
  return { error: null };
}
