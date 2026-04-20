import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { editarPerfil } from "./actions";

const ROLES = [
  { value: "admin",        label: "Administrador" },
  { value: "supervisor",   label: "Supervisor"    },
  { value: "profissional", label: "Profissional"  },
  { value: "secretaria",   label: "Secretaria"    },
];

const roleColors: Record<string, string> = {
  admin:        "bg-rust text-cream",
  supervisor:   "bg-forest text-cream",
  profissional: "bg-peach text-rust",
  secretaria:   "bg-sand text-rust",
};

export default async function EquipePage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome_completo, email, role, ativo, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <PageHeader
        eyebrow="Administração"
        title="Equipe"
        description="Usuários com acesso ao sistema e seus papéis"
      />

      <div className="space-y-3">
        {(profiles ?? []).map((p) => {
          const isSelf = p.id === profile.id;
          const action = editarPerfil.bind(null, p.id);
          return (
            <div key={p.id} className="card flex flex-wrap items-center gap-4 py-4">
              {/* Avatar + nome */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-forest/10 text-forest flex items-center justify-center font-display shrink-0">
                  {p.nome_completo.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-forest truncate">
                    {p.nome_completo}
                    {isSelf && <span className="ml-2 text-xs text-forest-400">(você)</span>}
                  </p>
                  <p className="text-sm text-forest-500 truncate">{p.email}</p>
                </div>
              </div>

              {/* Ações */}
              {isSelf ? (
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[p.role] ?? "bg-sand/30"}`}>
                    {ROLES.find((r) => r.value === p.role)?.label ?? p.role}
                  </span>
                  <span className="text-xs text-forest">● ativo</span>
                </div>
              ) : (
                <form action={action} className="flex items-center gap-2 flex-wrap">
                  <select
                    name="role"
                    defaultValue={p.role}
                    className="text-sm border border-sand/40 rounded-lg px-2 py-1.5 bg-white text-forest focus:outline-none focus:ring-1 focus:ring-forest/30"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <select
                    name="ativo"
                    defaultValue={p.ativo ? "true" : "false"}
                    className="text-sm border border-sand/40 rounded-lg px-2 py-1.5 bg-white text-forest focus:outline-none focus:ring-1 focus:ring-forest/30"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                  <button
                    type="submit"
                    className="text-sm bg-forest text-cream px-3 py-1.5 rounded-lg hover:bg-forest/90 transition-colors"
                  >
                    Salvar
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
