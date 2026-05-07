import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PlannerClient } from "./PlannerClient";

export default async function PlannerPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  // Planners compartilhados com este usuário
  const { data: sharedEntries } = await supabase
    .from("planner_compartilhamentos")
    .select("planner_id")
    .eq("shared_with_profile_id", profile.id);

  const sharedIds = (sharedEntries ?? []).map((r) => r.planner_id as string);

  // Todos os planners visíveis: próprios + compartilhados
  let plannersQuery = supabase
    .from("planners")
    .select("id, nome, owner_profile_id, profissional_id, ordem, criado_em")
    .order("criado_em", { ascending: true });

  if (sharedIds.length > 0) {
    plannersQuery = plannersQuery.or(
      `owner_profile_id.eq.${profile.id},id.in.(${sharedIds.join(",")})`,
    );
  } else {
    plannersQuery = plannersQuery.eq("owner_profile_id", profile.id);
  }

  const { data: planners } = await plannersQuery;

  // Tarefas dos planners visíveis
  const plannerIds = (planners ?? []).map((p: any) => p.id);
  const { data: tarefas } =
    plannerIds.length > 0
      ? await supabase
          .from("planner_tarefas")
          .select("id, planner_id, titulo, descricao, data_tarefa, concluida, concluida_em, criado_em")
          .in("planner_id", plannerIds)
          .order("criado_em", { ascending: true })
      : { data: [] };

  // Todos os usuários ativos (para modal de compartilhamento e tooltips)
  const { data: todosProfiles } = await supabase
    .from("profiles")
    .select("id, nome_completo, role, email")
    .eq("ativo", true)
    .order("nome_completo");

  // Mapa de compartilhamentos: plannerId → [profileIds compartilhados]
  const ownedIds = (planners ?? [])
    .filter((p: any) => p.owner_profile_id === profile.id)
    .map((p: any) => p.id as string);

  let compartilhadosMap: Record<string, string[]> = {};
  if (ownedIds.length > 0) {
    const { data: comps } = await supabase
      .from("planner_compartilhamentos")
      .select("planner_id, shared_with_profile_id")
      .in("planner_id", ownedIds);
    for (const c of comps ?? []) {
      if (!compartilhadosMap[c.planner_id]) compartilhadosMap[c.planner_id] = [];
      compartilhadosMap[c.planner_id].push(c.shared_with_profile_id);
    }
  }

  return (
    <PlannerClient
      planners={(planners as any) ?? []}
      tarefas={(tarefas as any) ?? []}
      todosProfiles={(todosProfiles as any) ?? []}
      compartilhadosMap={compartilhadosMap}
      currentUserId={profile.id}
    />
  );
}
