"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function editarPerfil(id: string, formData: FormData) {
  const supabase = createClient();

  const role = formData.get("role") as string;
  const ativo = formData.get("ativo") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({ role, ativo })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/equipe");
}
