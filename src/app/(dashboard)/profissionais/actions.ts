"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function cadastrarProfissional(formData: FormData) {
  const supabase = createClient();

  const profile_id = formData.get("profile_id") as string;
  const especialidade_id = (formData.get("especialidade_id") as string) || null;
  const registro_profissional =
    (formData.get("registro_profissional") as string) || null;
  const bio = (formData.get("bio") as string) || null;
  const valorRaw = formData.get("valor_consulta") as string;
  const valor_consulta = valorRaw ? parseFloat(valorRaw) : null;
  const duracao_padrao_min = parseInt(
    (formData.get("duracao_padrao_min") as string) || "50",
    10
  );

  const { error } = await supabase.from("profissionais").insert({
    profile_id,
    especialidade_id,
    registro_profissional,
    bio,
    valor_consulta,
    duracao_padrao_min,
    ativo: true,
  });

  if (error) {
    return redirect(
      `/profissionais/novo?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/profissionais");
  redirect("/profissionais");
}
