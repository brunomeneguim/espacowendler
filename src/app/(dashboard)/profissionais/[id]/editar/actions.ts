"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function editarProfissional(profissionalId: string, profileId: string, formData: FormData) {
  const supabase = createClient();

  const nome_completo = formData.get("nome_completo") as string;
  const especialidade_id = formData.get("especialidade_id") as string;
  const registro_profissional = (formData.get("registro_profissional") as string) || null;
  const valor_consulta = formData.get("valor_consulta") as string;
  const ativo = formData.get("ativo") === "true";
  const bio = (formData.get("bio") as string) || null;

  const [r1, r2] = await Promise.all([
    supabase
      .from("profiles")
      .update({ nome_completo })
      .eq("id", profileId),
    supabase
      .from("profissionais")
      .update({
        especialidade_id: especialidade_id ? parseInt(especialidade_id) : null,
        registro_profissional,
        valor_consulta: valor_consulta ? parseFloat(valor_consulta) : null,
        ativo,
      })
      .eq("id", profissionalId),
  ]);

  if (r1.error || r2.error) {
    const msg = r1.error?.message ?? r2.error?.message ?? "Erro ao salvar";
    return redirect(
      `/profissionais/${profissionalId}/editar?error=${encodeURIComponent(msg)}`
    );
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

    // Verifica duplicata
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
