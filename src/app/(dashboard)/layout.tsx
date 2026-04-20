import { Sidebar } from "@/components/Sidebar";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar role={profile.role} nome={profile.nome_completo} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
