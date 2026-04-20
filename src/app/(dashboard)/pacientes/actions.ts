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
  const data_nascimento =
    (formData.get("data_nascimento") as string) || null;
  const observacoes = (formData.get("observacoes") as string) || null;

  const { error } = await supabase.from("pacientes").insert({
    nome_completo,
    telefone,
    email,
    cpf,
    data_nascimento,
    observacoes,
  });

  if (error) {
    return redirect(`/pacientes/novo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/pacientes");
  redirect("/pacientes");
}
