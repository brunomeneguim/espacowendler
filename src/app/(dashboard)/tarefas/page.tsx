import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { TarefasClient } from "./TarefasClient";

export default async function TarefasPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  const [{ data: tarefasRaw }, { data: postits }, { data: profiles }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("id, titulo, descricao, concluida, prioridade, data_vencimento, criado_em, concluida_em, criado_por, atribuido_para, repeticao, criador:profiles!tarefas_criado_por_fkey(nome_completo), responsavel:profiles!tarefas_atribuido_para_fkey(nome_completo)")
      .order("criado_em", { ascending: false }),
    supabase
      .from("postits")
      .select("id, conteudo, cor, criado_em, criado_por, criador:profiles!postits_criado_por_fkey(nome_completo)")
      .order("criado_em", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, nome_completo")
      .eq("ativo", true)
      .order("nome_completo"),
  ]);

  // Reset automático de tarefas recorrentes concluídas no período anterior
  const agora = new Date();
  const idsParaResetar: string[] = (tarefasRaw ?? [])
    .filter((t: any) => {
      if (!t.concluida || !t.repeticao || t.repeticao === "nenhuma" || !t.concluida_em) return false;
      const concluidaEm = new Date(t.concluida_em);
      if (t.repeticao === "diaria") return agora.toDateString() !== concluidaEm.toDateString();
      if (t.repeticao === "semanal") return agora.getTime() - concluidaEm.getTime() >= 7 * 86400000;
      if (t.repeticao === "mensal") return agora.getMonth() !== concluidaEm.getMonth() || agora.getFullYear() !== concluidaEm.getFullYear();
      return false;
    })
    .map((t: any) => t.id);

  if (idsParaResetar.length > 0) {
    await supabase.from("tarefas")
      .update({ concluida: false, concluida_em: null })
      .in("id", idsParaResetar);
  }

  // Re-fetch após reset se necessário
  const { data: tarefas } = idsParaResetar.length > 0
    ? await supabase
        .from("tarefas")
        .select("id, titulo, descricao, concluida, prioridade, data_vencimento, criado_em, concluida_em, criado_por, atribuido_para, repeticao, criador:profiles!tarefas_criado_por_fkey(nome_completo), responsavel:profiles!tarefas_atribuido_para_fkey(nome_completo)")
        .order("criado_em", { ascending: false })
    : { data: tarefasRaw };

  return (
    <TarefasClient
      tarefas={(tarefas ?? []) as any}
      postits={(postits ?? []) as any}
      profiles={profiles ?? []}
      currentUserId={profile.id}
      currentRole={profile.role}
    />
  );
}
