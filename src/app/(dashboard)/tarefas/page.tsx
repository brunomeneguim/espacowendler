import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { TarefasClient } from "./TarefasClient";

export default async function TarefasPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  const [{ data: tarefas }, { data: postits }, { data: profiles }] = await Promise.all([
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
