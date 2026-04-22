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
      .select("id, nome_completo, role")
      .eq("ativo", true)
      .order("nome_completo"),
  ]);

  // Reset automático de tarefas recorrentes concluídas no período anterior
  // Usa o dia de criação como âncora: diária = novo dia, semanal = nova semana (mesmo dia da semana),
  // mensal = mesmo dia do mês seguinte.
  const agora = new Date();
  const idsParaResetar: string[] = (tarefasRaw ?? [])
    .filter((t: any) => {
      if (!t.concluida || !t.repeticao || t.repeticao === "nenhuma" || !t.concluida_em) return false;
      const concluidaEm = new Date(t.concluida_em);
      const criadoEm = new Date(t.criado_em);

      if (t.repeticao === "diaria") {
        // Reseta se o dia atual for diferente do dia em que foi concluída
        return agora.toDateString() !== concluidaEm.toDateString();
      }
      if (t.repeticao === "semanal") {
        // Reseta se passou pelo menos 7 dias desde a conclusão
        // e o dia da semana atual é igual ao dia da semana de criação
        const diasDesdeConclucao = Math.floor((agora.getTime() - concluidaEm.getTime()) / 86400000);
        return diasDesdeConclucao >= 7 && agora.getDay() === criadoEm.getDay();
      }
      if (t.repeticao === "mensal") {
        // Reseta quando o dia do mês atual for igual ao dia do mês de criação
        // e for um mês/ano posterior ao da conclusão
        const mesAtualMaior =
          agora.getFullYear() > concluidaEm.getFullYear() ||
          (agora.getFullYear() === concluidaEm.getFullYear() && agora.getMonth() > concluidaEm.getMonth());
        return mesAtualMaior && agora.getDate() >= criadoEm.getDate();
      }
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
