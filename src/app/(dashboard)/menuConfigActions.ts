"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface MenuItem {
  id: number;
  href: string;
  label: string;
  icon_name: string;
  ordem: number;
}

export async function salvarMenuConfig(
  items: { id: number; label: string; ordem: number }[]
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return { error: "Sem permissão." };

  const supabase = createClient();
  for (const item of items) {
    const { error } = await supabase
      .from("menu_config")
      .update({ label: item.label, ordem: item.ordem })
      .eq("id", item.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { error: null };
}
