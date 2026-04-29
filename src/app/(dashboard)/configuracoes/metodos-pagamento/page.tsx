import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { MetodosPagamentoClient } from "./MetodosPagamentoClient";

export default async function MetodosPagamentoPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = createClient();

  const { data: metodos } = await supabase
    .from("metodos_pagamento")
    .select("id, valor, label, ativo, ordem")
    .order("ordem");

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <PageHeader
        eyebrow="Configurações"
        title="Métodos de Pagamento"
        description="Adicione, edite e reordene os métodos de pagamento disponíveis no sistema"
      />
      <MetodosPagamentoClient metodosIniciais={(metodos as any) ?? []} />
    </div>
  );
}
