"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut } from "lucide-react";
import { signOut } from "../actions";
import { createClient } from "@/lib/supabase/client";

export default function AguardandoPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`profile-aprovacao-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const novoRole = (payload.new as { role: string }).role;
            if (novoRole && novoRole !== "pendente") {
              router.push("/dashboard");
            }
          }
        )
        .subscribe();
    }

    subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router]);

  return (
    <div className="animate-slide-up text-center">
      <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
        <span className="font-display text-xl text-forest">
          espaço<span className="italic text-rust">wendler</span>
        </span>
      </div>

      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-600" strokeWidth={1.5} />
        </div>
      </div>

      <p className="text-xs uppercase tracking-[0.2em] text-forest-500 mb-3">
        Conta criada
      </p>
      <h1 className="font-display text-3xl text-forest mb-3">
        Aguardando aprovação
      </h1>
      <p className="text-forest-600 text-sm leading-relaxed mb-8">
        Sua conta foi criada com sucesso. Um administrador precisa aprovar
        o seu acesso antes que você possa entrar no sistema.
        <br className="hidden sm:block" />
        <br className="hidden sm:block" />
        Assim que for aprovado, você receberá um e-mail e poderá fazer login normalmente.
      </p>

      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center gap-2 mx-auto text-sm text-forest-500 hover:text-rust transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </form>
    </div>
  );
}
