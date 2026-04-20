import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EquipePage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome_completo, email, role, ativo, created_at")
    .order("created_at", { ascending: false });

  const roleColors: Record<string, string> = {
    admin: "bg-rust text-cream",
    supervisor: "bg-forest text-cream",
    profissional: "bg-peach text-rust",
    secretaria: "bg-sand text-rust",
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <PageHeader
        eyebrow="Administração"
        title="Equipe"
        description="Usuários com acesso ao sistema e seus papéis"
      />

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-cream/60 border-b border-sand/30">
            <tr>
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wider text-forest-600 font-medium">
                Nome
              </th>
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wider text-forest-600 font-medium">
                Email
              </th>
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wider text-forest-600 font-medium">
                Papel
              </th>
              <th className="text-left px-6 py-3 text-xs uppercase tracking-wider text-forest-600 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/20">
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-cream/40 transition-colors">
                <td className="px-6 py-4 font-medium text-forest">
                  {p.nome_completo}
                </td>
                <td className="px-6 py-4 text-sm text-forest-600">
                  {p.email}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      roleColors[p.role] ?? "bg-sand/30 text-olive"
                    }`}
                  >
                    {p.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {p.ativo ? (
                    <span className="text-xs text-forest">● ativo</span>
                  ) : (
                    <span className="text-xs text-rust">● inativo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-forest-500 mt-4">
        Para alterar o papel de um usuário, edite diretamente pelo Supabase
        Dashboard → Table Editor → <code>profiles</code> → campo{" "}
        <code>role</code>. Em uma próxima iteração, essa tela permitirá editar
        inline.
      </p>
    </div>
  );
}
